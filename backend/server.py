from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Request, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import base64
import httpx
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'philatelic_db')]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'philatelic-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Stripe Configuration
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY')

# PayPal Configuration
PAYPAL_CLIENT_ID = os.environ.get('PAYPAL_CLIENT_ID')
PAYPAL_SECRET = os.environ.get('PAYPAL_SECRET')
PAYPAL_MODE = os.environ.get('PAYPAL_MODE', 'sandbox')

# Ollama Configuration (local AI)
OLLAMA_URL = os.environ.get('OLLAMA_URL', 'http://localhost:11434')

app = FastAPI(title="Philatelic Curator API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============== ENUMS ==============
class ProductType(str, Enum):
    STAMP = "stamp"
    ENVELOPE = "envelope"

class ProductCondition(str, Enum):
    MINT = "mint"
    EXCELLENT = "excellent"
    GOOD = "good"
    FAIR = "fair"
    POOR = "poor"

class RarityLevel(str, Enum):
    COMMON = "common"
    UNCOMMON = "uncommon"
    RARE = "rare"
    VERY_RARE = "very_rare"
    EXCEPTIONAL = "exceptional"

class PaymentStatus(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class OrderStatus(str, Enum):
    PENDING = "pending"
    PAID = "paid"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"

# ============== MODELS ==============
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    name: str
    is_admin: bool = False
    created_at: datetime

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class ProductBase(BaseModel):
    name: str
    description: str
    product_type: ProductType
    condition: ProductCondition
    is_obliterated: bool = False
    year: Optional[int] = None
    country: str
    category: str
    rarity: RarityLevel
    price: float
    estimated_value: float
    history: Optional[str] = None
    print_quantity: Optional[int] = None
    dimensions: Optional[str] = None
    image_url: Optional[str] = None

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    condition: Optional[ProductCondition] = None
    is_obliterated: Optional[bool] = None
    year: Optional[int] = None
    country: Optional[str] = None
    category: Optional[str] = None
    rarity: Optional[RarityLevel] = None
    price: Optional[float] = None
    estimated_value: Optional[float] = None
    history: Optional[str] = None
    print_quantity: Optional[int] = None
    dimensions: Optional[str] = None
    image_url: Optional[str] = None
    is_sold: Optional[bool] = None

class ProductResponse(ProductBase):
    model_config = ConfigDict(extra="ignore")
    id: str
    is_sold: bool = False
    created_at: datetime
    updated_at: datetime

class CartItem(BaseModel):
    product_id: str
    quantity: int = 1

class CartResponse(BaseModel):
    items: List[Dict[str, Any]]
    total: float

class OrderCreate(BaseModel):
    shipping_name: str
    shipping_address: str
    shipping_city: str
    shipping_postal_code: str
    shipping_country: str
    payment_method: str  # "stripe" or "paypal"

class OrderResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    items: List[Dict[str, Any]]
    total: float
    status: OrderStatus
    shipping_info: Dict[str, str]
    payment_method: str
    payment_status: PaymentStatus
    created_at: datetime

class AIAnalysisRequest(BaseModel):
    image_base64: str

class AIAnalysisResponse(BaseModel):
    condition: str
    is_obliterated: bool
    year: Optional[int]
    country: Optional[str]
    category: Optional[str]
    rarity: str
    estimated_value: float
    suggested_price: float
    history: Optional[str]
    description: str
    confidence: float

class CheckoutRequest(BaseModel):
    order_id: str
    origin_url: str

class PaymentTransactionResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    order_id: str
    amount: float
    currency: str
    payment_method: str
    status: PaymentStatus
    session_id: Optional[str]
    created_at: datetime

# ============== AUTH HELPERS ==============
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, email: str, is_admin: bool) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "is_admin": is_admin,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Optional[Dict]:
    if not credentials:
        return None
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def require_admin(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict:
    if not credentials:
        raise HTTPException(status_code=401, detail="Authentication required")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if not payload.get("is_admin"):
            raise HTTPException(status_code=403, detail="Admin access required")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ============== AUTH ROUTES ==============
@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user: UserCreate):
    existing = await db.users.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    # First user becomes admin
    user_count = await db.users.count_documents({})
    is_admin = user_count == 0
    
    user_doc = {
        "id": user_id,
        "email": user.email,
        "name": user.name,
        "password_hash": hash_password(user.password),
        "is_admin": is_admin,
        "created_at": now.isoformat()
    }
    await db.users.insert_one(user_doc)
    
    token = create_token(user_id, user.email, is_admin)
    return TokenResponse(
        access_token=token,
        user=UserResponse(id=user_id, email=user.email, name=user.name, is_admin=is_admin, created_at=now)
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user["id"], user["email"], user.get("is_admin", False))
    created_at = user["created_at"]
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at)
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            name=user["name"],
            is_admin=user.get("is_admin", False),
            created_at=created_at
        )
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: Dict = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user = await db.users.find_one({"id": current_user["sub"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    created_at = user["created_at"]
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at)
    return UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        is_admin=user.get("is_admin", False),
        created_at=created_at
    )

# ============== PRODUCT ROUTES ==============
@api_router.get("/products", response_model=List[ProductResponse])
async def get_products(
    product_type: Optional[ProductType] = None,
    condition: Optional[ProductCondition] = None,
    country: Optional[str] = None,
    category: Optional[str] = None,
    rarity: Optional[RarityLevel] = None,
    is_obliterated: Optional[bool] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    min_year: Optional[int] = None,
    max_year: Optional[int] = None,
    is_sold: bool = False,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    limit: int = 50,
    skip: int = 0
):
    query = {"is_sold": is_sold}
    
    if product_type:
        query["product_type"] = product_type
    if condition:
        query["condition"] = condition
    if country:
        query["country"] = {"$regex": country, "$options": "i"}
    if category:
        query["category"] = {"$regex": category, "$options": "i"}
    if rarity:
        query["rarity"] = rarity
    if is_obliterated is not None:
        query["is_obliterated"] = is_obliterated
    if min_price is not None:
        query["price"] = {"$gte": min_price}
    if max_price is not None:
        query.setdefault("price", {})["$lte"] = max_price
    if min_year is not None:
        query["year"] = {"$gte": min_year}
    if max_year is not None:
        query.setdefault("year", {})["$lte"] = max_year
    
    sort_direction = -1 if sort_order == "desc" else 1
    
    products = await db.products.find(query, {"_id": 0}).sort(sort_by, sort_direction).skip(skip).limit(limit).to_list(limit)
    
    for p in products:
        for field in ["created_at", "updated_at"]:
            if isinstance(p.get(field), str):
                p[field] = datetime.fromisoformat(p[field])
    
    return products

@api_router.get("/products/{product_id}", response_model=ProductResponse)
async def get_product(product_id: str):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    for field in ["created_at", "updated_at"]:
        if isinstance(product.get(field), str):
            product[field] = datetime.fromisoformat(product[field])
    return product

@api_router.post("/products", response_model=ProductResponse)
async def create_product(product: ProductCreate, admin: Dict = Depends(require_admin)):
    product_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    product_doc = product.model_dump()
    product_doc["id"] = product_id
    product_doc["is_sold"] = False
    product_doc["created_at"] = now.isoformat()
    product_doc["updated_at"] = now.isoformat()
    
    await db.products.insert_one(product_doc)
    
    product_doc["created_at"] = now
    product_doc["updated_at"] = now
    product_doc.pop("_id", None)
    
    return ProductResponse(**product_doc)

@api_router.put("/products/{product_id}", response_model=ProductResponse)
async def update_product(product_id: str, update: ProductUpdate, admin: Dict = Depends(require_admin)):
    existing = await db.products.find_one({"id": product_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Product not found")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.products.update_one({"id": product_id}, {"$set": update_data})
    
    updated = await db.products.find_one({"id": product_id}, {"_id": 0})
    for field in ["created_at", "updated_at"]:
        if isinstance(updated.get(field), str):
            updated[field] = datetime.fromisoformat(updated[field])
    
    return updated

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str, admin: Dict = Depends(require_admin)):
    result = await db.products.delete_one({"id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product deleted"}

@api_router.get("/products/stats/summary")
async def get_products_stats():
    stamps_count = await db.products.count_documents({"product_type": "stamp", "is_sold": False})
    envelopes_count = await db.products.count_documents({"product_type": "envelope", "is_sold": False})
    sold_count = await db.products.count_documents({"is_sold": True})
    
    countries = await db.products.distinct("country", {"is_sold": False})
    categories = await db.products.distinct("category", {"is_sold": False})
    
    return {
        "stamps_count": stamps_count,
        "envelopes_count": envelopes_count,
        "sold_count": sold_count,
        "countries": countries,
        "categories": categories
    }

# ============== CART ROUTES ==============
@api_router.get("/cart", response_model=CartResponse)
async def get_cart(session_id: str = Header(None, alias="X-Session-ID")):
    if not session_id:
        return CartResponse(items=[], total=0)
    
    cart = await db.carts.find_one({"session_id": session_id}, {"_id": 0})
    if not cart:
        return CartResponse(items=[], total=0)
    
    items_with_products = []
    total = 0
    
    for item in cart.get("items", []):
        product = await db.products.find_one({"id": item["product_id"], "is_sold": False}, {"_id": 0})
        if product:
            items_with_products.append({
                "product": product,
                "quantity": item["quantity"]
            })
            total += product["price"] * item["quantity"]
    
    return CartResponse(items=items_with_products, total=round(total, 2))

@api_router.post("/cart/add")
async def add_to_cart(item: CartItem, session_id: str = Header(None, alias="X-Session-ID")):
    if not session_id:
        session_id = str(uuid.uuid4())
    
    product = await db.products.find_one({"id": item.product_id, "is_sold": False})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found or already sold")
    
    cart = await db.carts.find_one({"session_id": session_id})
    
    if cart:
        existing_item = next((i for i in cart["items"] if i["product_id"] == item.product_id), None)
        if existing_item:
            raise HTTPException(status_code=400, detail="Product already in cart")
        await db.carts.update_one(
            {"session_id": session_id},
            {"$push": {"items": {"product_id": item.product_id, "quantity": 1}}}
        )
    else:
        await db.carts.insert_one({
            "session_id": session_id,
            "items": [{"product_id": item.product_id, "quantity": 1}],
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    return {"message": "Added to cart", "session_id": session_id}

@api_router.delete("/cart/{product_id}")
async def remove_from_cart(product_id: str, session_id: str = Header(None, alias="X-Session-ID")):
    if not session_id:
        raise HTTPException(status_code=400, detail="Session ID required")
    
    result = await db.carts.update_one(
        {"session_id": session_id},
        {"$pull": {"items": {"product_id": product_id}}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Item not found in cart")
    
    return {"message": "Removed from cart"}

@api_router.delete("/cart")
async def clear_cart(session_id: str = Header(None, alias="X-Session-ID")):
    if not session_id:
        raise HTTPException(status_code=400, detail="Session ID required")
    await db.carts.delete_one({"session_id": session_id})
    return {"message": "Cart cleared"}

# ============== ORDER ROUTES ==============
@api_router.post("/orders", response_model=OrderResponse)
async def create_order(order: OrderCreate, session_id: str = Header(None, alias="X-Session-ID")):
    if not session_id:
        raise HTTPException(status_code=400, detail="Session ID required")
    
    cart = await db.carts.find_one({"session_id": session_id})
    if not cart or not cart.get("items"):
        raise HTTPException(status_code=400, detail="Cart is empty")
    
    items_with_products = []
    total = 0
    
    for item in cart["items"]:
        product = await db.products.find_one({"id": item["product_id"], "is_sold": False}, {"_id": 0})
        if not product:
            raise HTTPException(status_code=400, detail=f"Product {item['product_id']} not available")
        items_with_products.append({
            "product_id": product["id"],
            "name": product["name"],
            "price": product["price"],
            "quantity": item["quantity"]
        })
        total += product["price"] * item["quantity"]
    
    order_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    order_doc = {
        "id": order_id,
        "session_id": session_id,
        "items": items_with_products,
        "total": round(total, 2),
        "status": OrderStatus.PENDING.value,
        "shipping_info": {
            "name": order.shipping_name,
            "address": order.shipping_address,
            "city": order.shipping_city,
            "postal_code": order.shipping_postal_code,
            "country": order.shipping_country
        },
        "payment_method": order.payment_method,
        "payment_status": PaymentStatus.PENDING.value,
        "created_at": now.isoformat()
    }
    
    await db.orders.insert_one(order_doc)
    
    order_doc["created_at"] = now
    order_doc["status"] = OrderStatus.PENDING
    order_doc["payment_status"] = PaymentStatus.PENDING
    
    return OrderResponse(**order_doc)

@api_router.get("/orders/{order_id}", response_model=OrderResponse)
async def get_order(order_id: str):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if isinstance(order.get("created_at"), str):
        order["created_at"] = datetime.fromisoformat(order["created_at"])
    
    return order

# ============== PAYMENT ROUTES (STRIPE) ==============
@api_router.post("/payments/stripe/checkout")
async def create_stripe_checkout(request: CheckoutRequest, http_request: Request):
    from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest
    
    order = await db.orders.find_one({"id": request.order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order["payment_status"] == PaymentStatus.COMPLETED.value:
        raise HTTPException(status_code=400, detail="Order already paid")
    
    api_key = STRIPE_API_KEY
    if not api_key:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    
    host_url = request.origin_url.rstrip('/')
    webhook_url = f"{str(http_request.base_url).rstrip('/')}/api/webhook/stripe"
    success_url = f"{host_url}/checkout/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{host_url}/checkout/cancel"
    
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
    
    checkout_request = CheckoutSessionRequest(
        amount=float(order["total"]),
        currency="eur",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "order_id": request.order_id,
            "source": "philatelic_curator"
        }
    )
    
    session = await stripe_checkout.create_checkout_session(checkout_request)
    
    # Create payment transaction record
    transaction_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    await db.payment_transactions.insert_one({
        "id": transaction_id,
        "order_id": request.order_id,
        "amount": float(order["total"]),
        "currency": "eur",
        "payment_method": "stripe",
        "status": PaymentStatus.PENDING.value,
        "session_id": session.session_id,
        "created_at": now.isoformat()
    })
    
    return {"checkout_url": session.url, "session_id": session.session_id}

@api_router.get("/payments/stripe/status/{session_id}")
async def get_stripe_payment_status(session_id: str):
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    
    api_key = STRIPE_API_KEY
    if not api_key:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url="")
    
    status = await stripe_checkout.get_checkout_status(session_id)
    
    # Update transaction and order if paid
    if status.payment_status == "paid":
        transaction = await db.payment_transactions.find_one({"session_id": session_id})
        if transaction and transaction["status"] != PaymentStatus.COMPLETED.value:
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {"status": PaymentStatus.COMPLETED.value}}
            )
            await db.orders.update_one(
                {"id": transaction["order_id"]},
                {"$set": {
                    "payment_status": PaymentStatus.COMPLETED.value,
                    "status": OrderStatus.PAID.value
                }}
            )
            # Mark products as sold
            order = await db.orders.find_one({"id": transaction["order_id"]})
            if order:
                for item in order["items"]:
                    await db.products.update_one(
                        {"id": item["product_id"]},
                        {"$set": {"is_sold": True}}
                    )
                # Clear cart
                await db.carts.delete_one({"session_id": order.get("session_id")})
    
    return {
        "status": status.status,
        "payment_status": status.payment_status,
        "amount_total": status.amount_total,
        "currency": status.currency
    }

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    
    api_key = STRIPE_API_KEY
    if not api_key:
        return {"status": "error", "message": "Stripe not configured"}
    
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url="")
    
    body = await request.body()
    signature = request.headers.get("Stripe-Signature")
    
    try:
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        logger.info(f"Stripe webhook: {webhook_response.event_type}")
        
        if webhook_response.event_type == "checkout.session.completed":
            session_id = webhook_response.session_id
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {"status": PaymentStatus.COMPLETED.value}}
            )
            
            transaction = await db.payment_transactions.find_one({"session_id": session_id})
            if transaction:
                await db.orders.update_one(
                    {"id": transaction["order_id"]},
                    {"$set": {
                        "payment_status": PaymentStatus.COMPLETED.value,
                        "status": OrderStatus.PAID.value
                    }}
                )
        
        return {"status": "processed"}
    except Exception as e:
        logger.error(f"Stripe webhook error: {e}")
        return {"status": "error"}

# ============== PAYMENT ROUTES (PAYPAL) ==============
@api_router.post("/payments/paypal/create")
async def create_paypal_order(request: CheckoutRequest):
    order = await db.orders.find_one({"id": request.order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order["payment_status"] == PaymentStatus.COMPLETED.value:
        raise HTTPException(status_code=400, detail="Order already paid")
    
    if not PAYPAL_CLIENT_ID or not PAYPAL_SECRET:
        raise HTTPException(status_code=500, detail="PayPal not configured")
    
    # Get PayPal access token
    base_url = "https://api-m.sandbox.paypal.com" if PAYPAL_MODE == "sandbox" else "https://api-m.paypal.com"
    
    async with httpx.AsyncClient() as client:
        auth_response = await client.post(
            f"{base_url}/v1/oauth2/token",
            headers={"Accept": "application/json"},
            data={"grant_type": "client_credentials"},
            auth=(PAYPAL_CLIENT_ID, PAYPAL_SECRET)
        )
        
        if auth_response.status_code != 200:
            raise HTTPException(status_code=500, detail="PayPal authentication failed")
        
        access_token = auth_response.json()["access_token"]
        
        # Create PayPal order
        paypal_order = await client.post(
            f"{base_url}/v2/checkout/orders",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {access_token}"
            },
            json={
                "intent": "CAPTURE",
                "purchase_units": [{
                    "reference_id": request.order_id,
                    "amount": {
                        "currency_code": "EUR",
                        "value": str(order["total"])
                    },
                    "description": f"Philatelic Curator - Order {request.order_id[:8]}"
                }],
                "application_context": {
                    "return_url": f"{request.origin_url}/checkout/success?paypal_order_id={{order_id}}",
                    "cancel_url": f"{request.origin_url}/checkout/cancel"
                }
            }
        )
        
        if paypal_order.status_code not in [200, 201]:
            raise HTTPException(status_code=500, detail="Failed to create PayPal order")
        
        paypal_data = paypal_order.json()
        
        # Create payment transaction record
        transaction_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        
        await db.payment_transactions.insert_one({
            "id": transaction_id,
            "order_id": request.order_id,
            "amount": float(order["total"]),
            "currency": "eur",
            "payment_method": "paypal",
            "status": PaymentStatus.PENDING.value,
            "session_id": paypal_data["id"],
            "created_at": now.isoformat()
        })
        
        approve_link = next((link["href"] for link in paypal_data["links"] if link["rel"] == "approve"), None)
        
        return {
            "paypal_order_id": paypal_data["id"],
            "approve_url": approve_link
        }

@api_router.post("/payments/paypal/capture/{paypal_order_id}")
async def capture_paypal_order(paypal_order_id: str):
    if not PAYPAL_CLIENT_ID or not PAYPAL_SECRET:
        raise HTTPException(status_code=500, detail="PayPal not configured")
    
    base_url = "https://api-m.sandbox.paypal.com" if PAYPAL_MODE == "sandbox" else "https://api-m.paypal.com"
    
    async with httpx.AsyncClient() as client:
        auth_response = await client.post(
            f"{base_url}/v1/oauth2/token",
            headers={"Accept": "application/json"},
            data={"grant_type": "client_credentials"},
            auth=(PAYPAL_CLIENT_ID, PAYPAL_SECRET)
        )
        
        if auth_response.status_code != 200:
            raise HTTPException(status_code=500, detail="PayPal authentication failed")
        
        access_token = auth_response.json()["access_token"]
        
        capture_response = await client.post(
            f"{base_url}/v2/checkout/orders/{paypal_order_id}/capture",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {access_token}"
            }
        )
        
        if capture_response.status_code not in [200, 201]:
            raise HTTPException(status_code=500, detail="Failed to capture PayPal payment")
        
        capture_data = capture_response.json()
        
        if capture_data["status"] == "COMPLETED":
            # Update transaction and order
            transaction = await db.payment_transactions.find_one({"session_id": paypal_order_id})
            if transaction:
                await db.payment_transactions.update_one(
                    {"session_id": paypal_order_id},
                    {"$set": {"status": PaymentStatus.COMPLETED.value}}
                )
                await db.orders.update_one(
                    {"id": transaction["order_id"]},
                    {"$set": {
                        "payment_status": PaymentStatus.COMPLETED.value,
                        "status": OrderStatus.PAID.value
                    }}
                )
                # Mark products as sold
                order = await db.orders.find_one({"id": transaction["order_id"]})
                if order:
                    for item in order["items"]:
                        await db.products.update_one(
                            {"id": item["product_id"]},
                            {"$set": {"is_sold": True}}
                        )
                    await db.carts.delete_one({"session_id": order.get("session_id")})
        
        return {
            "status": capture_data["status"],
            "order_id": transaction["order_id"] if transaction else None
        }

# ============== AI ANALYSIS ROUTES ==============
@api_router.post("/ai/analyze", response_model=AIAnalysisResponse)
async def analyze_image(request: AIAnalysisRequest, admin: Dict = Depends(require_admin)):
    """
    Analyze a stamp or envelope image using Ollama LLaVA model.
    The OLLAMA_URL should point to the user's local Ollama instance.
    """
    
    prompt = """Analyze this philatelic item (stamp or envelope) image and provide the following information in JSON format:

{
    "condition": "mint|excellent|good|fair|poor",
    "is_obliterated": true/false (whether it has a postmark/cancellation),
    "year": estimated year of issue (integer or null),
    "country": "country of origin",
    "category": "category/theme (e.g., 'Commemorative', 'Definitive', 'Airmail', etc.)",
    "rarity": "common|uncommon|rare|very_rare|exceptional",
    "estimated_value": estimated market value in EUR (number),
    "suggested_price": suggested selling price in EUR (number),
    "history": "brief historical context or significance",
    "description": "detailed description of the item",
    "confidence": confidence level 0-1 (number)
}

Be precise and realistic with valuations. Consider condition, rarity, age, and market demand."""

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{OLLAMA_URL}/api/generate",
                json={
                    "model": "llava",
                    "prompt": prompt,
                    "images": [request.image_base64],
                    "stream": False,
                    "format": "json"
                }
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=503, detail="AI service unavailable. Make sure Ollama is running with LLaVA model.")
            
            result = response.json()
            ai_response = result.get("response", "{}")
            
            import json
            try:
                parsed = json.loads(ai_response)
            except json.JSONDecodeError:
                # Try to extract JSON from response
                import re
                json_match = re.search(r'\{[^{}]*\}', ai_response, re.DOTALL)
                if json_match:
                    parsed = json.loads(json_match.group())
                else:
                    raise HTTPException(status_code=500, detail="Failed to parse AI response")
            
            return AIAnalysisResponse(
                condition=parsed.get("condition", "good"),
                is_obliterated=parsed.get("is_obliterated", False),
                year=parsed.get("year"),
                country=parsed.get("country", "Unknown"),
                category=parsed.get("category", "General"),
                rarity=parsed.get("rarity", "common"),
                estimated_value=float(parsed.get("estimated_value", 1.0)),
                suggested_price=float(parsed.get("suggested_price", 1.5)),
                history=parsed.get("history"),
                description=parsed.get("description", ""),
                confidence=float(parsed.get("confidence", 0.5))
            )
            
    except httpx.ConnectError:
        raise HTTPException(
            status_code=503, 
            detail="Cannot connect to Ollama. Please ensure Ollama is running on your machine with the LLaVA model installed."
        )
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="AI analysis timed out. Please try again.")

@api_router.get("/ai/status")
async def check_ai_status():
    """Check if the Ollama AI service is available"""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{OLLAMA_URL}/api/tags")
            if response.status_code == 200:
                models = response.json().get("models", [])
                has_llava = any("llava" in m.get("name", "").lower() for m in models)
                return {
                    "status": "online",
                    "ollama_url": OLLAMA_URL,
                    "has_llava": has_llava,
                    "models": [m.get("name") for m in models]
                }
            return {"status": "error", "message": "Ollama responded but with error"}
    except Exception as e:
        return {
            "status": "offline",
            "message": f"Cannot connect to Ollama at {OLLAMA_URL}",
            "error": str(e)
        }

# ============== ADMIN ROUTES ==============
@api_router.get("/admin/orders", response_model=List[OrderResponse])
async def get_all_orders(admin: Dict = Depends(require_admin), status: Optional[str] = None, limit: int = 50):
    query = {}
    if status:
        query["status"] = status
    
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    
    for order in orders:
        if isinstance(order.get("created_at"), str):
            order["created_at"] = datetime.fromisoformat(order["created_at"])
    
    return orders

@api_router.put("/admin/orders/{order_id}/status")
async def update_order_status(order_id: str, status: OrderStatus, admin: Dict = Depends(require_admin)):
    result = await db.orders.update_one(
        {"id": order_id},
        {"$set": {"status": status.value}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"message": "Order status updated"}

@api_router.get("/admin/stats")
async def get_admin_stats(admin: Dict = Depends(require_admin)):
    total_products = await db.products.count_documents({})
    available_products = await db.products.count_documents({"is_sold": False})
    sold_products = await db.products.count_documents({"is_sold": True})
    
    total_orders = await db.orders.count_documents({})
    paid_orders = await db.orders.count_documents({"payment_status": PaymentStatus.COMPLETED.value})
    pending_orders = await db.orders.count_documents({"payment_status": PaymentStatus.PENDING.value})
    
    # Calculate revenue
    pipeline = [
        {"$match": {"payment_status": PaymentStatus.COMPLETED.value}},
        {"$group": {"_id": None, "total": {"$sum": "$total"}}}
    ]
    revenue_result = await db.orders.aggregate(pipeline).to_list(1)
    total_revenue = revenue_result[0]["total"] if revenue_result else 0
    
    return {
        "products": {
            "total": total_products,
            "available": available_products,
            "sold": sold_products
        },
        "orders": {
            "total": total_orders,
            "paid": paid_orders,
            "pending": pending_orders
        },
        "revenue": round(total_revenue, 2)
    }

# ============== ROOT ROUTE ==============
@api_router.get("/")
async def root():
    return {"message": "Philatelic Curator API", "version": "1.0.0"}

# Include router and middleware
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
