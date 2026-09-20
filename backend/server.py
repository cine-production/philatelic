from fastapi import (
    FastAPI,
    APIRouter,
    HTTPException,
    Depends,
    UploadFile,
    File,
    Request,
    Header,
)
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import base64
import httpx
from google import genai
from google.genai import types
import stripe
import asyncio
import resend
import io
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
from enum import Enum
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# MongoDB connection
mongo_url = os.environ.get("MONGO_URL")
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get("DB_NAME", "philatelic_db")]

# JWT Configuration
JWT_SECRET = os.environ.get("JWT_SECRET", "philatelic-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Resend Email Configuration
RESEND_API_KEY = os.environ.get("RESEND_API_KEY")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL')  # Email admin pour notifications
SITE_NAME = os.environ.get("SITE_NAME", "MemeWear")
SITE_URL = os.environ.get("SITE_URL", "https://localhost:3000")

if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY

# Stripe Configuration
STRIPE_API_KEY = os.environ.get("STRIPE_API_KEY")

# PayPal Configuration
PAYPAL_CLIENT_ID = os.environ.get("PAYPAL_CLIENT_ID")
PAYPAL_SECRET = os.environ.get("PAYPAL_SECRET")
PAYPAL_MODE = os.environ.get("PAYPAL_MODE", "sandbox")

# Ollama Configuration (local AI)
OLLAMA_URL = os.environ.get("OLLAMA_URL", "https://localhost:11434")
# Google Gemini Configuration (free tier)
GEMINI_API_KEY = os.environ.get(
    "GEMINI_API_KEY", "AIzaSyCfP5J30grXthwSvf9bGNL0DXUb2VDAscc"
)

app = FastAPI(title="MemeWear API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


# ============== ENUMS ==============
class ProductType(str, Enum):
    MEME = "meme"       # T-shirts drôles / memes d'influenceurs
    MODERN = "modern"   # T-shirts style moderne / minimaliste
    CUSTOM = "custom"   # T-shirts personnalisés


class ProductCondition(str, Enum):
    # Conservé pour compat technique (utilisé comme "état du stock")
    MINT = "mint"
    EXCELLENT = "excellent"
    GOOD = "good"
    FAIR = "fair"
    POOR = "poor"


class RarityLevel(str, Enum):
    # Réutilisé comme "niveau d'exclusivité" du design (édition limitée, etc.)
    COMMON = "common"
    UNCOMMON = "uncommon"
    RARE = "rare"
    VERY_RARE = "very_rare"
    EXCEPTIONAL = "exceptional"


class TShirtSize(str, Enum):
    XS = "XS"
    S = "S"
    M = "M"
    L = "L"
    XL = "XL"
    XXL = "XXL"


class PaymentStatus(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class OrderStatus(str, Enum):
    PENDING = "pending"
    PAID = "paid"
    PREPARING = "preparing"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    RECEIVED = "received"
    CANCELLED = "cancelled"


class StampCategory(str, Enum):
    DEFINITIVE = "DEF"  # Définitif (usage courant)
    COMMEMORATIVE = "COM"  # Commémoratif
    AIRMAIL = "AIR"  # Poste aérienne
    TAX = "TAX"  # Taxe
    ENVELOPE = "ENV"  # Enveloppe
    BLOCK = "BLO"  # Bloc-feuillet
    OTHER = "AUT"  # Autre


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


class ColorVariant(BaseModel):
    color: str
    price: Optional[float] = None  # prix spécifique à cette couleur (sinon = prix du produit)
    stock_quantity: int = 0  # ignoré si unlimited_stock=True
    images: List[str] = []  # images spécifiques à cette couleur (sinon fallback sur "images")


class ProductBase(BaseModel):
    name: str
    description: str
    product_type: ProductType  # meme | modern | custom
    condition: ProductCondition = ProductCondition.EXCELLENT
    is_obliterated: bool = False  # legacy, non utilisé côté t-shirt
    year: Optional[int] = None
    country: str = "France"
    category: str  # ex: "Influenceurs", "Minimaliste", "Streetwear"...
    style: Optional[str] = None  # ex: "Oversize", "Regular", "Crop"...
    rarity: RarityLevel = RarityLevel.COMMON  # utilisé comme "édition limitée"
    price: float
    estimated_value: float = 0
    history: Optional[str] = None
    print_quantity: Optional[int] = None
    dimensions: Optional[str] = None  # ex: matière / coupe ("Coton bio, coupe regular")
    image_url: Optional[str] = None  # image principale (conservé pour compat, = images[0])
    images: List[str] = []  # galerie de photos de présentation
    stock_quantity: int = 1
    unlimited_stock: bool = True  # les t-shirts sont fabriqués à la demande : pas de limite de stock
    is_preorder: bool = True  # produit en précommande (fabrication après seuil atteint)
    preorder_threshold: Optional[int] = None  # nb de précommandes nécessaires avant fabrication
    preorder_count: int = 0  # nb de précommandes déjà reçues (mis à jour automatiquement)
    classification_id: Optional[str] = None
    sizes: List[str] = ["S", "M", "L", "XL"]
    colors: List[str] = ["Noir", "Blanc"]  # legacy simple, conservé pour compat
    color_variants: List[ColorVariant] = []  # couleur -> stock + images dédiées
    is_customizable: bool = False  # true pour les t-shirts personnalisables


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    product_type: Optional[ProductType] = None
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
    images: Optional[List[str]] = None
    is_sold: Optional[bool] = None
    stock_quantity: Optional[int] = None
    unlimited_stock: Optional[bool] = None
    is_preorder: Optional[bool] = None
    preorder_threshold: Optional[int] = None
    preorder_count: Optional[int] = None
    style: Optional[str] = None
    classification_id: Optional[str] = None
    sizes: Optional[List[str]] = None
    colors: Optional[List[str]] = None
    color_variants: Optional[List[ColorVariant]] = None
    is_customizable: Optional[bool] = None


class ProductResponse(ProductBase):
    model_config = ConfigDict(extra="ignore")
    id: str
    is_sold: bool = False
    stock_quantity: int = 1
    classification_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class CartItem(BaseModel):
    product_id: str
    quantity: int = 1
    size: Optional[str] = None
    color: Optional[str] = None
    custom_notes: Optional[str] = None  # texte/description libre pour un t-shirt personnalisé
    custom_image_base64: Optional[str] = None  # aperçu (PNG ou 1ère page PDF rendue)
    custom_file_base64: Optional[str] = None  # fichier original envoyé (PNG ou PDF) pour la fabrication
    custom_file_type: Optional[str] = None  # mime type du fichier original
    custom_position: Optional[Dict[str, float]] = None  # {x, y, scale} choisi par le client sur l'aperçu


class CartResponse(BaseModel):
    items: List[Dict[str, Any]]
    total: float


class OrderCreate(BaseModel):
    customer_email: str
    shipping_name: str
    shipping_address: str
    shipping_city: str
    shipping_postal_code: str
    shipping_country: str
    payment_method: str  # "stripe" or "paypal"


class OrderUpdateAdmin(BaseModel):
    status: Optional[OrderStatus] = None
    tracking_number: Optional[str] = None
    carrier: Optional[str] = None
    admin_notes: Optional[str] = None


class OrderResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    tracking_code: str
    customer_email: str
    items: List[Dict[str, Any]]
    total: float
    status: OrderStatus
    shipping_info: Dict[str, str]
    payment_method: str
    payment_status: PaymentStatus
    tracking_number: Optional[str] = None
    carrier: Optional[str] = None
    admin_notes: Optional[str] = None
    created_at: datetime
    shipped_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    received_at: Optional[datetime] = None


class AIAnalysisRequest(BaseModel):
    image_base64: str
    provider: str = "gemini"  # "gemini", "ollama", or "manual"


class AIAnalysisResponse(BaseModel):
    condition: str = "good"
    is_obliterated: bool = False
    year: Optional[int] = None
    country: Optional[str] = None
    country_code: Optional[str] = None
    category: Optional[str] = None
    category_code: Optional[str] = None
    rarity: str = "common"
    estimated_value: float = 1.0
    suggested_price: float = 1.5
    history: Optional[str] = None
    description: str = ""
    confidence: float = 0.7
    classification_id: Optional[str] = None


class TaxonomyItem(BaseModel):
    name: str


class TaxonomyResponse(BaseModel):
    id: str
    name: str


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


# ============== EMAIL HELPERS ==============
async def send_order_email(to_email: str, subject: str, html_content: str):
    """Send an email using Resend API (non-blocking)"""
    if not RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not configured - skipping email")
        return None

    try:
        params = {
            "from": f"{SITE_NAME} <{SENDER_EMAIL}>",
            "to": [to_email],
            "subject": subject,
            "html": html_content,
        }
        result = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Email sent to {to_email}: {subject}")
        return result
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        return None


def get_order_confirmation_email(order: dict) -> str:
    """Generate HTML for order confirmation email"""
    items_html = ""
    for item in order.get("items", []):
        items_html += f"""
        <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">{item['name']}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">{item['quantity']}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">{item['price']:.2f} €</td>
        </tr>
        """

    tracking_code = order.get("tracking_code", order.get("id", "")[:8].upper())

    return f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #8B1538; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">Commande Confirmée</h1>
        </div>
        
        <div style="padding: 20px;">
            <p>Bonjour {order['shipping_info']['name']},</p>
            <p>Merci pour votre commande ! Nous avons bien reçu votre paiement.</p>
            
            <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0;"><strong>Code de suivi :</strong></p>
                <p style="font-size: 24px; font-family: monospace; margin: 10px 0; color: #8B1538;">{tracking_code}</p>
                <a href="{SITE_URL}/suivi/{tracking_code}" style="color: #8B1538;">Suivre ma commande</a>
            </div>
            
            <h3>Récapitulatif de votre commande</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background: #f5f5f5;">
                        <th style="padding: 10px; text-align: left;">Article</th>
                        <th style="padding: 10px; text-align: center;">Qté</th>
                        <th style="padding: 10px; text-align: right;">Prix</th>
                    </tr>
                </thead>
                <tbody>
                    {items_html}
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="2" style="padding: 10px; text-align: right;"><strong>Total :</strong></td>
                        <td style="padding: 10px; text-align: right; font-size: 18px; color: #8B1538;"><strong>{order['total']:.2f} €</strong></td>
                    </tr>
                </tfoot>
            </table>
            
            <h3>Adresse de livraison</h3>
            <p>
                {order['shipping_info']['name']}<br>
                {order['shipping_info']['address']}<br>
                {order['shipping_info']['postal_code']} {order['shipping_info']['city']}<br>
                {order['shipping_info']['country']}
            </p>
            
            <p style="color: #666; font-size: 14px; margin-top: 30px;">
                Votre commande sera préparée avec soin et expédiée dans les plus brefs délais.
            </p>
        </div>
        
        <div style="background: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666;">
            <p>{SITE_NAME} - Vos t-shirts, votre style</p>
        </div>
    </body>
    </html>
    """


def get_shipping_email(order: dict) -> str:
    """Generate HTML for shipping notification email"""
    tracking_code = order.get("tracking_code", order.get("id", "")[:8].upper())
    tracking_number = order.get("tracking_number", "")
    carrier = order.get("carrier", "")

    tracking_link = ""
    if tracking_number and carrier:
        if "poste" in carrier.lower() or "colissimo" in carrier.lower():
            tracking_link = f'<a href="https://www.laposte.fr/outils/suivre-vos-envois?code={tracking_number}" style="color: #8B1538;">Suivre sur La Poste</a>'
        else:
            tracking_link = f"<p>Numéro de suivi : <strong>{tracking_number}</strong> ({carrier})</p>"

    return f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #2563eb; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">Votre colis est en route !</h1>
        </div>
        
        <div style="padding: 20px;">
            <p>Bonjour {order['shipping_info']['name']},</p>
            <p>Bonne nouvelle ! Votre commande a été expédiée.</p>
            
            <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Transporteur :</strong> {carrier or 'Non spécifié'}</p>
                <p><strong>Numéro de suivi :</strong> {tracking_number or 'En attente'}</p>
                {tracking_link}
            </div>
            
            <div style="background: #e0f2fe; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0;"><strong>Suivez votre commande sur notre site :</strong></p>
                <a href="{SITE_URL}/suivi/{tracking_code}" style="font-size: 18px; color: #2563eb;">{SITE_URL}/suivi/{tracking_code}</a>
            </div>
            
            <p style="color: #666; font-size: 14px;">
                Une fois le colis reçu, n'oubliez pas de confirmer la réception sur notre site.
            </p>
        </div>
        
        <div style="background: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666;">
            <p>{SITE_NAME} - Vos t-shirts, votre style</p>
        </div>
    </body>
    </html>
    """


def get_delivered_email(order: dict) -> str:
    """Generate HTML for delivery notification email"""
    tracking_code = order.get("tracking_code", order.get("id", "")[:8].upper())

    return f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #7c3aed; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">Colis livré !</h1>
        </div>
        
        <div style="padding: 20px;">
            <p>Bonjour {order['shipping_info']['name']},</p>
            <p>Votre colis a été marqué comme livré.</p>
            
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
                <p style="margin-bottom: 15px;">Avez-vous bien reçu votre commande ?</p>
                <a href="{SITE_URL}/suivi/{tracking_code}" 
                   style="display: inline-block; background: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                    Confirmer la réception
                </a>
            </div>
            
            <p style="color: #666; font-size: 14px;">
                Si vous rencontrez un problème avec votre commande, n'hésitez pas à nous contacter.
            </p>
        </div>
        
        <div style="background: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666;">
            <p>{SITE_NAME} - Vos t-shirts, votre style</p>
        </div>
    </body>
    </html>
    """

def get_admin_new_order_email(order: dict) -> str:
    """Generate HTML for admin notification of new order"""
    items_html = ""
    for item in order.get("items", []):
        items_html += f"""
        <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">{item.get('classification_id', 'N/A')}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">{item['name']}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">{item['price']:.2f} €</td>
        </tr>
        """
    
    tracking_code = order.get("tracking_code", order.get("id", "")[:8].upper())
    shipping = order.get("shipping_info", {})
    
    return f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #22c55e; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">Nouvelle Commande !</h1>
        </div>
        
        <div style="padding: 20px;">
            <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 15px; margin-bottom: 20px;">
                <p style="margin: 0; font-size: 18px;"><strong>Code:</strong> {tracking_code}</p>
                <p style="margin: 5px 0 0 0; font-size: 24px; color: #22c55e;"><strong>{order['total']:.2f} €</strong></p>
            </div>
            
            <h3>Client</h3>
            <p>
                <strong>{shipping.get('name', '')}</strong><br>
                {order.get('customer_email', 'Email non renseigné')}<br>
                {shipping.get('address', '')}<br>
                {shipping.get('postal_code', '')} {shipping.get('city', '')}<br>
                {shipping.get('country', '')}
            </p>
            
            <h3>Articles commandés</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background: #f5f5f5;">
                        <th style="padding: 8px; text-align: left;">ID</th>
                        <th style="padding: 8px; text-align: left;">Article</th>
                        <th style="padding: 8px; text-align: right;">Prix</th>
                    </tr>
                </thead>
                <tbody>
                    {items_html}
                </tbody>
            </table>
            
            <div style="margin-top: 20px; text-align: center;">
                <a href="{SITE_URL}/admin/commandes" 
                   style="display: inline-block; background: #8B1538; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                    Voir dans l'admin
                </a>
            </div>
        </div>
    </body>
    </html>
    """

async def send_admin_notification(order: dict):
    """Send notification email to admin for new order"""
    if not ADMIN_EMAIL or not RESEND_API_KEY:
        logger.info("Admin email not configured - skipping notification")
        return None
    
    try:
        await send_order_email(
            ADMIN_EMAIL,
            f"[NOUVELLE COMMANDE] {order.get('tracking_code', order['id'][:8].upper())} - {order['total']:.2f} €",
            get_admin_new_order_email(order)
        )
        logger.info(f"Admin notification sent for order {order.get('tracking_code')}")
    except Exception as e:
        logger.error(f"Failed to send admin notification: {e}")

# ============== AUTH HELPERS ==============
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))


def create_token(user_id: str, email: str, is_admin: bool) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "is_admin": is_admin,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> Optional[Dict]:
    if not credentials:
        return None
    try:
        payload = jwt.decode(
            credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM]
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def require_admin(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> Dict:
    if not credentials:
        raise HTTPException(status_code=401, detail="Authentication required")
    try:
        payload = jwt.decode(
            credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM]
        )
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
    # Ce site n'a qu'un seul administrateur (le propriétaire de la boutique) :
    # l'inscription publique est fermée dès qu'un compte existe déjà.
    user_count = await db.users.count_documents({})
    if user_count > 0:
        raise HTTPException(
            status_code=403,
            detail="Les inscriptions sont fermées. Contactez l'administrateur du site.",
        )

    existing = await db.users.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    # Le tout premier compte créé devient automatiquement administrateur
    is_admin = True

    user_doc = {
        "id": user_id,
        "email": user.email,
        "name": user.name,
        "password_hash": hash_password(user.password),
        "is_admin": is_admin,
        "created_at": now.isoformat(),
    }
    await db.users.insert_one(user_doc)

    token = create_token(user_id, user.email, is_admin)
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user_id,
            email=user.email,
            name=user.name,
            is_admin=is_admin,
            created_at=now,
        ),
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
            created_at=created_at,
        ),
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
        created_at=created_at,
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
    skip: int = 0,
):
    query = {"is_sold": is_sold}

    if product_type:
        query["product_type"] = product_type
    else:
        # Masque les anciens produits (timbres/enveloppes) qui ne correspondent plus
        # aux catégories actuelles, pour éviter une erreur de validation
        query["product_type"] = {"$in": [t.value for t in ProductType]}
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

    products = (
        await db.products.find(query, {"_id": 0})
        .sort(sort_by, sort_direction)
        .skip(skip)
        .limit(limit)
        .to_list(limit)
    )

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
    # La personnalisation n'est possible que pour les produits de type "custom"
    # (les bases neutres pour t-shirts personnalisés), jamais pour meme/modern.
    if product_doc.get("product_type") != ProductType.CUSTOM.value:
        product_doc["is_customizable"] = False
    elif product_doc.get("product_type") == ProductType.CUSTOM.value:
        product_doc["is_customizable"] = True

    # image_url reste le champ "principal" utilisé par le reste du code (panier, emails...)
    if not product_doc.get("image_url") and product_doc.get("images"):
        product_doc["image_url"] = product_doc["images"][0]
    elif product_doc.get("image_url") and not product_doc.get("images"):
        product_doc["images"] = [product_doc["image_url"]]

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
async def update_product(
    product_id: str, update: ProductUpdate, admin: Dict = Depends(require_admin)
):
    existing = await db.products.find_one({"id": product_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Product not found")

    update_data = {k: v for k, v in update.model_dump().items() if v is not None}

    # La personnalisation n'est possible que pour les produits de type "custom"
    resulting_type = update_data.get("product_type", existing.get("product_type"))
    if resulting_type != ProductType.CUSTOM.value:
        update_data["is_customizable"] = False
    elif "product_type" in update_data:
        # on vient de passer le produit en type "custom" : personnalisable par défaut
        update_data.setdefault("is_customizable", True)

    if "images" in update_data and update_data["images"] and "image_url" not in update_data:
        update_data["image_url"] = update_data["images"][0]

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
    meme_count = await db.products.count_documents(
        {"product_type": "meme", "is_sold": False}
    )
    modern_count = await db.products.count_documents(
        {"product_type": "modern", "is_sold": False}
    )
    custom_count = await db.products.count_documents(
        {"product_type": "custom", "is_sold": False}
    )
    sold_count = await db.products.count_documents({"is_sold": True})

    countries = await db.products.distinct("country", {"is_sold": False})
    categories = await db.products.distinct("category", {"is_sold": False})

    return {
        "meme_count": meme_count,
        "modern_count": modern_count,
        "custom_count": custom_count,
        # alias conservés pour compat avec d'anciens appels front
        "stamps_count": meme_count,
        "envelopes_count": modern_count,
        "sold_count": sold_count,
        "countries": countries,
        "categories": categories,
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
        product = await db.products.find_one(
            {"id": item["product_id"], "is_sold": False}, {"_id": 0}
        )
        if product:
            effective_price = get_effective_price(product, item.get("color"))
            items_with_products.append(
                {
                    "product": product,
                    "quantity": item["quantity"],
                    "size": item.get("size"),
                    "color": item.get("color"),
                    "unit_price": effective_price,
                    "custom_notes": item.get("custom_notes"),
                    "custom_image_base64": item.get("custom_image_base64"),
                    "custom_file_base64": item.get("custom_file_base64"),
                    "custom_file_type": item.get("custom_file_type"),
                    "custom_position": item.get("custom_position"),
                }
            )
            total += effective_price * item["quantity"]

    return CartResponse(items=items_with_products, total=round(total, 2))


@api_router.post("/cart/add")
async def add_to_cart(
    item: CartItem, session_id: str = Header(None, alias="X-Session-ID")
):
    if not session_id:
        session_id = str(uuid.uuid4())

    product = await db.products.find_one({"id": item.product_id, "is_sold": False})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found or already sold")

    # Check stock (sauf si stock illimité, cas des t-shirts fabriqués à la demande)
    available = get_available_stock(product, item.color)
    if available is None:
        quantity = item.quantity
    else:
        if available <= 0:
            raise HTTPException(status_code=400, detail="Produit en rupture de stock pour cette couleur")
        quantity = min(item.quantity, available)  # Cap at available stock

    new_item = {
        "product_id": item.product_id,
        "quantity": quantity,
        "size": item.size,
        "color": item.color,
        "custom_notes": item.custom_notes,
        "custom_image_base64": item.custom_image_base64,
        "custom_file_base64": item.custom_file_base64,
        "custom_file_type": item.custom_file_type,
        "custom_position": item.custom_position,
    }

    cart = await db.carts.find_one({"session_id": session_id})

    if cart:
        # Une ligne est fusionnable seulement si même produit + même taille/couleur
        # (un t-shirt personnalisé avec un visuel différent reste une ligne distincte)
        existing_item = next(
            (
                i
                for i in cart["items"]
                if i["product_id"] == item.product_id
                and i.get("size") == item.size
                and i.get("color") == item.color
                and not item.custom_image_base64
                and not i.get("custom_image_base64")
            ),
            None,
        )

        if existing_item:
            # Update quantity if item exists
            available = get_available_stock(product, item.color)
            if available is None:
                new_qty = existing_item["quantity"] + quantity
            else:
                new_qty = min(existing_item["quantity"] + quantity, available)

            await db.carts.update_one(
                {
                    "session_id": session_id,
                    "items.product_id": item.product_id,
                    "items.size": item.size,
                    "items.color": item.color,
                },
                {"$set": {"items.$.quantity": new_qty}},
            )

        else:
            # Add new item to existing cart
            await db.carts.update_one(
                {"session_id": session_id},
                {"$push": {"items": new_item}},
            )

    else:
        # Create new cart
        await db.carts.insert_one(
            {
                "session_id": session_id,
                "items": [new_item],
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        )

    return {"message": "Added to cart", "session_id": session_id}


@api_router.delete("/cart/{product_id}")
async def remove_from_cart(
    product_id: str, session_id: str = Header(None, alias="X-Session-ID")
):
    if not session_id:
        raise HTTPException(status_code=400, detail="Session ID required")

    result = await db.carts.update_one(
        {"session_id": session_id}, {"$pull": {"items": {"product_id": product_id}}}
    )

    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Item not found in cart")

    return {"message": "Removed from cart"}

class UpdateQuantityRequest(BaseModel):
    quantity: int

@api_router.put("/cart/{product_id}")
async def update_cart_quantity(product_id: str, request: UpdateQuantityRequest, session_id: str = Header(None, alias="X-Session-ID")):
    if not session_id:
        raise HTTPException(status_code=400, detail="Session ID required")
    
    # Check product stock
    product = await db.products.find_one({"id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Check product stock (sauf si stock illimité)
    if not product.get("unlimited_stock", False):
        cart = await db.carts.find_one({"session_id": session_id})
        item_color = None
        if cart:
            existing = next((i for i in cart.get("items", []) if i["product_id"] == product_id), None)
            if existing:
                item_color = existing.get("color")
        available = get_available_stock(product, item_color)
        if available is not None and request.quantity > available:
            raise HTTPException(status_code=400, detail=f"Stock insuffisant (max: {available})")
    
    if request.quantity < 1:
        # Remove from cart if quantity is 0 or less
        await db.carts.update_one(
            {"session_id": session_id},
            {"$pull": {"items": {"product_id": product_id}}}
        )
    else:
        result = await db.carts.update_one(
            {"session_id": session_id, "items.product_id": product_id},
            {"$set": {"items.$.quantity": request.quantity}}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Item not found in cart")
    
    return {"message": "Quantity updated"}


@api_router.delete("/cart")
async def clear_cart(session_id: str = Header(None, alias="X-Session-ID")):
    if not session_id:
        raise HTTPException(status_code=400, detail="Session ID required")
    await db.carts.delete_one({"session_id": session_id})
    return {"message": "Cart cleared"}


# ============== ORDER ROUTES ==============
def generate_tracking_code():
    """Generate a unique tracking code for customer order tracking"""
    import random
    import string

    chars = string.ascii_uppercase + string.digits
    return "".join(random.choices(chars, k=8))


# ============== HELPERS: STOCK / PRÉCOMMANDE ==============
def get_effective_price(product: dict, color: Optional[str] = None) -> float:
    """Retourne le prix à appliquer : celui de la variante couleur si défini, sinon le prix produit."""
    variants = product.get("color_variants") or []
    if color and variants:
        for v in variants:
            if v.get("color") == color and v.get("price") is not None:
                return v.get("price")
    return product.get("price", 0)


def get_available_stock(product: dict, color: Optional[str] = None) -> Optional[int]:
    """Retourne le stock disponible pour un produit (et une couleur si fournie).
    Retourne None si le stock est illimité (pas de vérification à faire)."""
    if product.get("unlimited_stock", False):
        return None

    variants = product.get("color_variants") or []
    if color and variants:
        for v in variants:
            if v.get("color") == color:
                return v.get("stock_quantity", 0)
        # couleur demandée mais absente des variantes -> aucun stock défini
        return 0

    return product.get("stock_quantity", 1)


async def apply_order_to_products(order: dict):
    """Décrémente le stock (sauf si stock illimité) et incrémente le compteur
    de précommandes pour chaque produit d'une commande payée."""
    for item in order.get("items", []):
        product = await db.products.find_one({"id": item["product_id"]})
        if not product:
            continue

        update_data = {}

        if product.get("is_preorder"):
            update_data["preorder_count"] = product.get("preorder_count", 0) + item["quantity"]

        if not product.get("unlimited_stock", False):
            variants = product.get("color_variants") or []
            color = item.get("color")

            if color and variants:
                new_variants = []
                for v in variants:
                    if v.get("color") == color:
                        v = {**v, "stock_quantity": max(0, v.get("stock_quantity", 0) - item["quantity"])}
                    new_variants.append(v)
                update_data["color_variants"] = new_variants
                # is_sold seulement si TOUTES les couleurs sont épuisées
                if all(v.get("stock_quantity", 0) <= 0 for v in new_variants):
                    update_data["is_sold"] = True
            else:
                new_stock = max(0, product.get("stock_quantity", 1) - item["quantity"])
                update_data["stock_quantity"] = new_stock
                if new_stock == 0:
                    update_data["is_sold"] = True

        if update_data:
            await db.products.update_one({"id": item["product_id"]}, {"$set": update_data})


@api_router.post("/orders", response_model=OrderResponse)
async def create_order(
    order: OrderCreate, session_id: str = Header(None, alias="X-Session-ID")
):
    if not session_id:
        raise HTTPException(status_code=400, detail="Session ID required")

    cart = await db.carts.find_one({"session_id": session_id})
    if not cart or not cart.get("items"):
        raise HTTPException(status_code=400, detail="Cart is empty")

    items_with_products = []
    total = 0

    for item in cart["items"]:
        product = await db.products.find_one(
            {"id": item["product_id"], "is_sold": False}, {"_id": 0}
        )
        if not product:
            raise HTTPException(
                status_code=400, detail=f"Product {item['product_id']} not available"
            )
        # Check stock (sauf si stock illimité, cas des t-shirts fabriqués à la demande)
        available = get_available_stock(product, item.get("color"))
        if available is not None and available < item["quantity"]:
            raise HTTPException(
                status_code=400, detail=f"Stock insuffisant pour {product['name']}"
            )

        items_with_products.append(
            {
                "product_id": product["id"],
                "name": product["name"],
                "price": get_effective_price(product, item.get("color")),
                "quantity": item["quantity"],
                "size": item.get("size"),
                "color": item.get("color"),
                "custom_notes": item.get("custom_notes"),
                "custom_image_base64": item.get("custom_image_base64"),
                "custom_file_base64": item.get("custom_file_base64"),
                "custom_file_type": item.get("custom_file_type"),
                "custom_position": item.get("custom_position"),
                "classification_id": product.get("classification_id"),
                "image_url": product.get("image_url"),
            }
        )
        total += get_effective_price(product, item.get("color")) * item["quantity"]

    order_id = str(uuid.uuid4())
    tracking_code = generate_tracking_code()
    now = datetime.now(timezone.utc)
        
    # Calculate shipping
    SHIPPING_THRESHOLD = 25.0
    SHIPPING_COST = 3.99
    subtotal = round(total, 2)
    shipping_cost = 0 if subtotal >= SHIPPING_THRESHOLD else SHIPPING_COST
    final_total = round(subtotal + shipping_cost, 2)

    order_doc = {
        "id": order_id,
        "tracking_code": tracking_code,
        "session_id": session_id,
        "customer_email": order.customer_email,
        "items": items_with_products,
        "subtotal": subtotal,
        "shipping_cost": shipping_cost,
        "total": final_total,
        "status": OrderStatus.PENDING.value,
        "shipping_info": {
            "name": order.shipping_name,
            "address": order.shipping_address,
            "city": order.shipping_city,
            "postal_code": order.shipping_postal_code,
            "country": order.shipping_country,
        },
        "payment_method": order.payment_method,
        "payment_status": PaymentStatus.PENDING.value,
        "created_at": now.isoformat(),
        "tracking_number": None,
        "carrier": None,
        "admin_notes": None,
        "shipped_at": None,
        "delivered_at": None,
        "received_at": None,
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

    # Parse dates
    for field in ["created_at", "shipped_at", "delivered_at", "received_at"]:
        if isinstance(order.get(field), str):
            order[field] = datetime.fromisoformat(order[field])

    return order


@api_router.get("/orders/track/{tracking_code}")
async def track_order(tracking_code: str, email: str = None):
    """Public endpoint for customers to track their order - requires email verification"""
    order = await db.orders.find_one({"tracking_code": tracking_code}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Commande non trouvée")

    # Verify email matches
    if not email or order.get("customer_email", "").lower() != email.lower():
        raise HTTPException(status_code=403, detail="L'email ne correspond pas à la commande")

    # Parse dates
    for field in ["created_at", "shipped_at", "delivered_at", "received_at"]:
        if isinstance(order.get(field), str):
            order[field] = datetime.fromisoformat(order[field])

    # Return limited info for public access
    return {
        "tracking_code": order["tracking_code"],
        "status": order["status"],
        "payment_status": order["payment_status"],
        "items": [
            {"name": i["name"], "quantity": i["quantity"]} for i in order["items"]
        ],
        "total": order["total"],
        "shipping_info": {
            "name": order["shipping_info"]["name"],
            "city": order["shipping_info"]["city"],
            "country": order["shipping_info"]["country"],
        },
        "tracking_number": order.get("tracking_number"),
        "carrier": order.get("carrier"),
        "created_at": order["created_at"],
        "shipped_at": order.get("shipped_at"),
        "delivered_at": order.get("delivered_at"),
        "received_at": order.get("received_at"),
        "customer_email": order.get("customer_email")  # Return for confirmation form
    }

class ConfirmReceptionRequest(BaseModel):
    customer_email: str

@api_router.post("/orders/track/{tracking_code}/confirm-reception")
async def confirm_reception(tracking_code: str, request: ConfirmReceptionRequest):
    """Public endpoint for customer to confirm they received the package - requires email verification"""
    order = await db.orders.find_one({"tracking_code": tracking_code})
    if not order:
        raise HTTPException(status_code=404, detail="Commande non trouvée")

    # Verify email matches
    if not request.customer_email or order.get("customer_email", "").lower() != request.customer_email.lower():
        raise HTTPException(status_code=403, detail="L'email ne correspond pas à la commande")

    if order["status"] not in [OrderStatus.SHIPPED.value, OrderStatus.DELIVERED.value]:
        raise HTTPException(
            status_code=400, detail="La commande n'est pas encore expédiée ou livrée"
        )

    now = datetime.now(timezone.utc)
    # Mark as received and auto-archive
    await db.orders.update_one(
        {"tracking_code": tracking_code},
        {
        "$set": {
            "status": OrderStatus.RECEIVED.value,
            "received_at": now.isoformat(),
            "is_archived": True,
            "archived_at": now.isoformat()
            }
        }
    )

    return {"message": "Réception confirmée", "status": "received"}

@api_router.delete("/orders/{order_id}/cancel")
async def cancel_pending_order(order_id: str, session_id: str = Header(None, alias="X-Session-ID")):
    """Cancel and delete a pending (unpaid) order"""
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Commande non trouvée")
    
    # Only allow cancellation of pending orders
    if order["payment_status"] != PaymentStatus.PENDING.value:
        raise HTTPException(status_code=400, detail="Seules les commandes non payées peuvent être annulées")
    
    # Verify session ownership
    if order.get("session_id") != session_id:
        raise HTTPException(status_code=403, detail="Non autorisé")
    
    # Delete the order
    await db.orders.delete_one({"id": order_id})
    await db.payment_transactions.delete_many({"order_id": order_id})
    
    return {"message": "Commande annulée"}


# ============== PAYMENT ROUTES (STRIPE) ==============


@api_router.post("/payments/stripe/checkout")
async def create_stripe_checkout(request: CheckoutRequest, http_request: Request):
    order = await db.orders.find_one({"id": request.order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order["payment_status"] == PaymentStatus.COMPLETED.value:
        raise HTTPException(status_code=400, detail="Order already paid")

    if not STRIPE_API_KEY:
        raise HTTPException(status_code=500, detail="Stripe not configured")

    stripe.api_key = STRIPE_API_KEY

    host_url = request.origin_url.rstrip("/")
    success_url = f"{host_url}/checkout/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{host_url}/checkout/cancel?order_id={request.order_id}"

    try:
        # Create Stripe Checkout Session
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[
                {
                    "price_data": {
                        "currency": "eur",
                        "product_data": {
                            "name": f"Commande MemeWear #{request.order_id[:8]}",
                            "description": f'{len(order["items"])} article(s)',
                        },
                        "unit_amount": int(order["total"] * 100),  # Stripe uses cents
                    },
                    "quantity": 1,
                }
            ],
            mode="payment",
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={"order_id": request.order_id, "source": "philatelic_curator"},
        )

        # Create payment transaction record
        transaction_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)

        await db.payment_transactions.insert_one(
            {
                "id": transaction_id,
                "order_id": request.order_id,
                "amount": float(order["total"]),
                "currency": "eur",
                "payment_method": "stripe",
                "status": PaymentStatus.PENDING.value,
                "session_id": session.id,
                "created_at": now.isoformat(),
            }
        )

        return {"checkout_url": session.url, "session_id": session.id}

    except stripe.error.StripeError as e:
        logger.error(f"Stripe error: {e}")
        raise HTTPException(status_code=500, detail=f"Stripe error: {str(e)}")


@api_router.get("/payments/stripe/status/{session_id}")
async def get_stripe_payment_status(session_id: str):
    if not STRIPE_API_KEY:
        raise HTTPException(status_code=500, detail="Stripe not configured")

    stripe.api_key = STRIPE_API_KEY

    try:
        session = stripe.checkout.Session.retrieve(session_id)

        # Update transaction and order if paid
        if session.payment_status == "paid":
            transaction = await db.payment_transactions.find_one(
                {"session_id": session_id}
            )

            if transaction and transaction["status"] != PaymentStatus.COMPLETED.value:
                await db.payment_transactions.update_one(
                    {"session_id": session_id},
                    {"$set": {"status": PaymentStatus.COMPLETED.value}},
                )

                await db.orders.update_one(
                    {"id": transaction["order_id"]},
                    {
                        "$set": {
                            "payment_status": PaymentStatus.COMPLETED.value,
                            "status": OrderStatus.PAID.value,
                        }
                    },
                )

                # Mettre à jour stock / précommandes
                order = await db.orders.find_one({"id": transaction["order_id"]})

                if order:
                    await apply_order_to_products(order)

                    # Clear cart
                    await db.carts.delete_one({"session_id": order.get("session_id")})

                    # Send confirmation email
                    customer_email = order.get("customer_email")
                    if customer_email:
                        await send_order_email(
                            customer_email,
                            f"Confirmation de votre commande {order.get('tracking_code', order['id'][:8].upper())}",
                            get_order_confirmation_email(order),
                        )
                        # Send admin notification
                    await send_admin_notification(order)

        return {
            "status": session.status,
            "payment_status": session.payment_status,
            "amount_total": session.amount_total / 100 if session.amount_total else 0,
            "currency": session.currency,
        }

    except stripe.error.StripeError as e:
        logger.error(f"Stripe status error: {e}")
        raise HTTPException(status_code=500, detail=f"Stripe error: {str(e)}")


@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    if not STRIPE_API_KEY:
        return {"status": "error", "message": "Stripe not configured"}

    stripe.api_key = STRIPE_API_KEY

    body = await request.body()

    try:
        event = stripe.Event.construct_from(
            stripe.util.convert_to_dict(stripe.util.json.loads(body)), stripe.api_key
        )

        logger.info(f"Stripe webhook: {event.type}")

        if event.type == "checkout.session.completed":
            session = event.data.object
            session_id = session.id

            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {"status": PaymentStatus.COMPLETED.value}},
            )

            transaction = await db.payment_transactions.find_one(
                {"session_id": session_id}
            )
            if transaction:
                await db.orders.update_one(
                    {"id": transaction["order_id"]},
                    {
                        "$set": {
                            "payment_status": PaymentStatus.COMPLETED.value,
                            "status": OrderStatus.PAID.value,
                        }
                    },
                )

        return {"status": "processed"}
    except Exception as e:
        logger.error(f"Stripe webhook error: {e}")
        return {"status": "error"}


# ============== PAYMENT ROUTES (PAYPAL) ==============
@api_router.post("/payments/paypal/create")
async def create_paypal_order(request: CheckoutRequest):
    try:
        order = await db.orders.find_one({"id": request.order_id}, {"_id": 0})
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")

        if order["payment_status"] == PaymentStatus.COMPLETED.value:
            raise HTTPException(status_code=400, detail="Order already paid")

        if not PAYPAL_CLIENT_ID or not PAYPAL_SECRET:
            logger.error("PayPal credentials not configured")
            raise HTTPException(status_code=500, detail="PayPal not configured")

        # Get PayPal access token
        base_url = (
            "https://api-m.sandbox.paypal.com"
            if PAYPAL_MODE == "sandbox"
            else "https://api-m.paypal.com"
        )
        logger.info(f"PayPal mode: {PAYPAL_MODE}, base_url: {base_url}")

        # Step 1: Get access token
        auth_client = httpx.AsyncClient(timeout=30.0)
        try:
            auth_response = await auth_client.post(
                f"{base_url}/v1/oauth2/token",
                headers={"Accept": "application/json"},
                data={"grant_type": "client_credentials"},
                auth=(PAYPAL_CLIENT_ID, PAYPAL_SECRET),
            )
        finally:
            await auth_client.aclose()

            if auth_response.status_code != 200:
                logger.error(
                    f"PayPal auth failed: {auth_response.status_code} - {auth_response.text}"
                )
                raise HTTPException(
                    status_code=500,
                    detail=f"PayPal authentication failed: {auth_response.text}",
                )

            access_token = auth_response.json()["access_token"]

        # Step 2: Create PayPal order with new client
        order_client = httpx.AsyncClient(timeout=30.0)
        try:
            paypal_order = await order_client.post(
                f"{base_url}/v2/checkout/orders",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {access_token}",
                },
                json={
                    "intent": "CAPTURE",
                    "purchase_units": [
                        {
                            "reference_id": request.order_id,
                            "amount": {
                                "currency_code": "EUR",
                                "value": str(round(order["total"], 2)),
                            },
                            "description": f"MemeWear - Order {request.order_id[:8]}",
                        }
                    ],
                    "application_context": {
                        "brand_name": SITE_NAME,
                        "return_url": f"{request.origin_url}/checkout/success",
                        "cancel_url": f"{request.origin_url}/checkout/cancel?order_id={request.order_id}"
                    },
                },
            )
        finally:
            await order_client.aclose()

        if paypal_order.status_code not in [200, 201]:
            logger.error(
                f"PayPal order creation failed: {paypal_order.status_code} - {paypal_order.text}"
            )
            raise HTTPException(
                status_code=500,
                detail=f"Failed to create PayPal order: {paypal_order.text}",
            )

        paypal_data = paypal_order.json()

        # Create payment transaction record
        transaction_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)

        await db.payment_transactions.insert_one(
            {
                "id": transaction_id,
                "order_id": request.order_id,
                "amount": float(order["total"]),
                "currency": "eur",
                "payment_method": "paypal",
                "status": PaymentStatus.PENDING.value,
                "session_id": paypal_data["id"],
                "created_at": now.isoformat(),
            }
        )

        approve_link = next(
            (link["href"] for link in paypal_data["links"] if link["rel"] == "approve"),
            None,
        )

        logger.info(f"PayPal order created: {paypal_data['id']}")
        return {"paypal_order_id": paypal_data["id"], "approve_url": approve_link}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"PayPal create order error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"PayPal error: {str(e)}")


@api_router.post("/payments/paypal/capture/{paypal_order_id}")
async def capture_paypal_order(paypal_order_id: str):
    if not PAYPAL_CLIENT_ID or not PAYPAL_SECRET:
        raise HTTPException(status_code=500, detail="PayPal not configured")

    base_url = (
        "https://api-m.sandbox.paypal.com"
        if PAYPAL_MODE == "sandbox"
        else "https://api-m.paypal.com"
    )

    try:
        # Step 1: Get access token
        auth_client = httpx.AsyncClient(timeout=30.0)
        try:
            auth_response = await auth_client.post(
                f"{base_url}/v1/oauth2/token",
                headers={"Accept": "application/json"},
                data={"grant_type": "client_credentials"},
                auth=(PAYPAL_CLIENT_ID, PAYPAL_SECRET),
            )
        finally:
            await auth_client.aclose()

        if auth_response.status_code != 200:
            logger.error(f"PayPal auth failed: {auth_response.status_code}")
            raise HTTPException(status_code=500, detail="PayPal authentication failed")

        access_token = auth_response.json()["access_token"]

        # Step 2: Capture payment
        capture_client = httpx.AsyncClient(timeout=30.0)
        try:
            capture_response = await capture_client.post(
                f"{base_url}/v2/checkout/orders/{paypal_order_id}/capture",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {access_token}",
                },
            )
        finally:
            await capture_client.aclose()

        if capture_response.status_code not in [200, 201]:
            logger.error(
                f"PayPal capture failed: {capture_response.status_code} - {capture_response.text}"
            )
            raise HTTPException(
                status_code=500, detail="Failed to capture PayPal payment"
            )

        capture_data = capture_response.json()
        transaction = None

        if capture_data["status"] == "COMPLETED":
            # Update transaction and order
            transaction = await db.payment_transactions.find_one(
                {"session_id": paypal_order_id}
            )
            if transaction:
                await db.payment_transactions.update_one(
                    {"session_id": paypal_order_id},
                    {"$set": {"status": PaymentStatus.COMPLETED.value}},
                )
                await db.orders.update_one(
                    {"id": transaction["order_id"]},
                    {
                        "$set": {
                            "payment_status": PaymentStatus.COMPLETED.value,
                            "status": OrderStatus.PAID.value,
                        }
                    },
                )
                # Mettre à jour stock / précommandes
                order = await db.orders.find_one({"id": transaction["order_id"]})
                if order:
                    await apply_order_to_products(order)
                    await db.carts.delete_one({"session_id": order.get("session_id")})

                    # Send confirmation email
                    customer_email = order.get("customer_email")
                    if customer_email:
                        await send_order_email(
                            customer_email,
                            f"Confirmation de votre commande {order.get('tracking_code', order['id'][:8].upper())}",
                            get_order_confirmation_email(order),
                        )
                        # Send admin notification
                    await send_admin_notification(order)

        return {
            "status": capture_data["status"],
            "order_id": transaction["order_id"] if transaction else None,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"PayPal capture error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"PayPal error: {str(e)}")


# ============== AI ANALYSIS ROUTES ==============

AI_PROMPT = """Tu es un expert philatéliste. Analyse cette image de timbre ou enveloppe et fournis les informations suivantes en JSON.

IMPORTANT:
- Si tu n'es pas certain d'une information, indique "null" ou une estimation avec une confiance faible
- Pour la DATE/ANNÉE: sois très prudent, regarde attentivement les inscriptions sur le timbre
- Pour le PAYS: identifie la langue et les symboles nationaux
- Vérifie également sur ce site https://colnect.com/fr/stamps si possible  
- Pour la VALEUR: base-toi sur l'état, la rareté estimée et l'ancienneté


CODES PAYS (utilise ces codes ISO à 2 lettres):
FR=France, DE=Allemagne, US=États-Unis, GB=Royaume-Uni, IT=Italie, ES=Espagne, 
BE=Belgique, CH=Suisse, NL=Pays-Bas, AT=Autriche, PT=Portugal, RU=Russie, etc.

CODES CATÉGORIE:
DEF=Définitif (usage courant), COM=Commémoratif, AIR=Poste aérienne, TAX=Taxe, 
ENV=Enveloppe, BLO=Bloc-feuillet, AUT=Autre

Format JSON requis:

{
    "condition": "mint|excellent|good|fair|poor",
    "is_obliterated": true/false,
    "year": année d'émission (entier ou null si incertain),
    "country": "pays d'origine (nom complet)",
    "country_code": "code ISO 2 lettres (FR, DE, US, etc.)",
    "category": "catégorie (Commémoratif, Définitif, Poste aérienne, etc.)",
    "category_code": "code catégorie (DEF, COM, AIR, TAX, ENV, BLO, AUT)",
    "rarity": "common|uncommon|rare|very_rare|exceptional",
    "estimated_value": valeur estimée en EUR (nombre),
    "suggested_price": prix de vente suggéré en EUR (nombre),
    "history": "contexte historique bref si connu",
    "description": "description détaillée de ce qui est visible sur le timbre",
    "visible_text": "tout texte visible sur le timbre (dates, noms, valeurs faciales)",
    "confidence": niveau de confiance 0-1 (nombre, sois honnête)
}

RETOURNE UNIQUEMENT LE JSON, PAS DE TEXTE AVANT OU APRÈS."""


async def analyze_with_gemini(image_base64: str) -> dict:
    """Analyze image using Google Gemini Flash (free tier)"""

    if not GEMINI_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="Gemini API key not configured. Add GEMINI_API_KEY to .env",
        )

    client = genai.Client(api_key=GEMINI_API_KEY)

    # Decode base64 image
    image_bytes = base64.b64decode(image_base64)

    # Create the content with image
    response = client.models.generate_content(
        model="gemini-flash-latest",
        contents=[
            types.Content(
                role="user",
                parts=[
                    types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg"),
                    types.Part.from_text(text=AI_PROMPT),
                ],
            )
        ],
    )

    return response.text


async def analyze_with_ollama(image_base64: str) -> dict:
    """Analyze image using local Ollama LLaVA"""
    async with httpx.AsyncClient(timeout=180.0) as client:
        response = await client.post(
            f"{OLLAMA_URL}/api/generate",
            json={
                "model": "llava",
                "prompt": AI_PROMPT,
                "images": [image_base64],
                "stream": False,
                "format": "json",
            },
        )

        if response.status_code != 200:
            raise HTTPException(status_code=503, detail="Ollama unavailable")

        return response.json().get("response", "{}")


def parse_ai_response(ai_response: str) -> dict:
    """Parse AI response to extract JSON"""
    import json
    import re

    # Try direct JSON parse
    try:
        return json.loads(ai_response)
    except json.JSONDecodeError:
        pass

    # Try to extract JSON from response
    json_match = re.search(r"\{[^{}]*\}", ai_response, re.DOTALL)
    if json_match:
        try:
            return json.loads(json_match.group())
        except json.JSONDecodeError:
            pass

    # Try to find JSON with nested braces
    json_match = re.search(r"\{.*\}", ai_response, re.DOTALL)
    if json_match:
        try:
            return json.loads(json_match.group())
        except json.JSONDecodeError:
            pass

    raise HTTPException(status_code=500, detail="Failed to parse AI response")


@api_router.post("/ai/analyze", response_model=AIAnalysisResponse)
async def analyze_image(
    request: AIAnalysisRequest, admin: Dict = Depends(require_admin)
):
    """
    Analyze a stamp or envelope image using selected AI provider.
    Providers: 'gemini' (Google Gemini Flash, free), 'ollama' (local LLaVA)
    """

    try:
        if request.provider == "gemini":
            ai_response = await analyze_with_gemini(request.image_base64)
        elif request.provider == "ollama":
            ai_response = await analyze_with_ollama(request.image_base64)
        else:
            raise HTTPException(
                status_code=400, detail=f"Unknown provider: {request.provider}"
            )

        parsed = parse_ai_response(ai_response)

        # Validate and normalize rarity
        valid_rarities = ["common", "uncommon", "rare", "very_rare", "exceptional"]
        rarity = parsed.get("rarity", "common").lower().replace(" ", "_")
        if rarity not in valid_rarities:
            rarity = "common"

        # Validate condition
        valid_conditions = ["mint", "excellent", "good", "fair", "poor"]
        condition = parsed.get("condition", "good").lower()
        if condition not in valid_conditions:
            condition = "good"

        # Extract country and category codes
        country_code = parsed.get("country_code", "XX")
        if not country_code or len(country_code) != 2:
            # Try to infer from country name
            country_name = str(parsed.get("country", "")).upper()
            country_codes = {
                "FRANCE": "FR",
                "ALLEMAGNE": "DE",
                "GERMANY": "DE",
                "ÉTATS-UNIS": "US",
                "USA": "US",
                "UNITED STATES": "US",
                "ROYAUME-UNI": "GB",
                "UK": "GB",
                "ITALIE": "IT",
                "ITALY": "IT",
                "ESPAGNE": "ES",
                "SPAIN": "ES",
                "BELGIQUE": "BE",
                "BELGIUM": "BE",
                "SUISSE": "CH",
                "SWITZERLAND": "CH",
                "PAYS-BAS": "NL",
                "NETHERLANDS": "NL",
                "AUTRICHE": "AT",
                "AUSTRIA": "AT",
                "PORTUGAL": "PT",
                "RUSSIE": "RU",
                "RUSSIA": "RU",
                "JAPON": "JP",
                "JAPAN": "JP",
                "CHINE": "CN",
                "CHINA": "CN",
                "CANADA": "CA",
                "AUSTRALIE": "AU",
                "AUSTRALIA": "AU",
            }
            country_code = country_codes.get(country_name, "XX")

        category_code = parsed.get("category_code", "AUT")
        if not category_code or category_code not in [
            "DEF",
            "COM",
            "AIR",
            "TAX",
            "ENV",
            "BLO",
            "AUT",
        ]:
            # Try to infer from category name
            cat_name = str(parsed.get("category", "")).lower()
            if (
                "définitif" in cat_name
                or "definitive" in cat_name
                or "courant" in cat_name
            ):
                category_code = "DEF"
            elif "commémoratif" in cat_name or "commemorative" in cat_name:
                category_code = "COM"
            elif "aérien" in cat_name or "air" in cat_name:
                category_code = "AIR"
            elif "taxe" in cat_name or "tax" in cat_name:
                category_code = "TAX"
            elif "enveloppe" in cat_name or "envelope" in cat_name:
                category_code = "ENV"
            elif "bloc" in cat_name or "block" in cat_name:
                category_code = "BLO"
            else:
                category_code = "AUT"

        # Generate classification ID: YEAR-COUNTRY-CATEGORY-NUMBER
        year = parsed.get("year") if isinstance(parsed.get("year"), int) else None
        year_str = str(year) if year else "XXXX"

        # Get next sequence number for this combination
        sequence_filter = {
            "classification_id": {
                "$regex": f"^{year_str}-{country_code}-{category_code}-"
            }
        }
        count = await db.products.count_documents(sequence_filter)
        sequence_num = str(count + 1).zfill(3)

        classification_id = f"{year_str}-{country_code}-{category_code}-{sequence_num}"

        return AIAnalysisResponse(
            condition=condition,
            is_obliterated=bool(parsed.get("is_obliterated", False)),
            ear=year,
            country=str(parsed.get("country", "Unknown")),
            ountry_code=country_code,
            category=str(parsed.get("category", "General")),
            ategory_code=category_code,
            rarity=rarity,
            estimated_value=float(parsed.get("estimated_value", 1.0)),
            suggested_price=float(parsed.get("suggested_price", 1.5)),
            history=parsed.get("history"),
            description=str(parsed.get("description", "")),
            onfidence=min(1.0, max(0.0, float(parsed.get("confidence", 0.7)))),
            classification_id=classification_id,
        )

    except HTTPException:
        raise
    except httpx.ConnectError:
        raise HTTPException(
            status_code=503, detail="Cannot connect to Ollama. Make sure it's running."
        )
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail="AI analysis timed out. Try Gemini for faster results.",
        )
    except Exception as e:
        logger.error(f"AI analysis error: {e}")
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {str(e)}")


class GenerateClassificationIdRequest(BaseModel):
    year: Optional[int] = None
    country_code: str = "XX"
    category_code: str = "AUT"


@api_router.post("/ai/generate-classification-id")
async def generate_classification_id(
    request: GenerateClassificationIdRequest, admin: Dict = Depends(require_admin)
):
    """Generate a unique classification ID for manual entry"""
    year_str = str(request.year) if request.year else "XXXX"
    country_code = request.country_code.upper()[:2] if request.country_code else "XX"

    # Validate category code
    valid_categories = ["DEF", "COM", "AIR", "TAX", "ENV", "BLO", "AUT"]
    category_code = (
        request.category_code.upper()
        if request.category_code in valid_categories
        else "AUT"
    )

    # Get next sequence number
    sequence_filter = {
        "classification_id": {"$regex": f"^{year_str}-{country_code}-{category_code}-"}
    }
    count = await db.products.count_documents(sequence_filter)
    sequence_num = str(count + 1).zfill(3)

    classification_id = f"{year_str}-{country_code}-{category_code}-{sequence_num}"

    return {"classification_id": classification_id}


@api_router.get("/ai/status")
async def check_ai_status():
    """Check available AI providers"""
    result = {"providers": []}

    # Check Gemini
    if GEMINI_API_KEY:
        result["providers"].append(
            {
                "id": "gemini",
                "name": "Google Gemini Flash",
                "status": "available",
                "description": "Rapide, gratuit (15 req/min)",
                "recommended": True,
            }
        )
    else:
        result["providers"].append(
            {
                "id": "gemini",
                "name": "Google Gemini Flash",
                "status": "not_configured",
                "description": "Ajoutez GEMINI_API_KEY dans .env",
                "recommended": True,
            }
        )

    # Check Ollama
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{OLLAMA_URL}/api/tags")
            if response.status_code == 200:
                models = response.json().get("models", [])
                has_llava = any("llava" in m.get("name", "").lower() for m in models)
                result["providers"].append(
                    {
                        "id": "ollama",
                        "name": "Ollama LLaVA (Local)",
                        "status": "available" if has_llava else "no_model",
                        "description": (
                            "Gratuit, hors ligne, lent (~2 min)"
                            if has_llava
                            else "Installez LLaVA: ollama pull llava"
                        ),
                        "has_llava": has_llava,
                        "models": [m.get("name") for m in models],
                    }
                )
            else:
                result["providers"].append(
                    {
                        "id": "ollama",
                        "name": "Ollama LLaVA (Local)",
                        "status": "error",
                        "description": "Ollama répond mais avec erreur",
                    }
                )
    except Exception:
        result["providers"].append(
            {
                "id": "ollama",
                "name": "Ollama LLaVA (Local)",
                "status": "offline",
                "description": "Ollama non démarré (ollama serve)",
            }
        )

    return result


# ============== ADMIN ROUTES ==============
@api_router.get("/admin/orders", response_model=List[OrderResponse])
async def get_all_orders(
    admin: Dict = Depends(require_admin),
    status: Optional[str] = None,
    limit: int = 50,
    archived: Optional[bool] = None,
):
    query = {}
    if status:
        query["status"] = status
    if archived is True:
        query["is_archived"] = True
    elif archived is False:
        query["is_archived"] = {"$ne": True}
    # Si archived n'est pas fourni, on retourne tout (comportement original)

    orders = (
        await db.orders.find(query, {"_id": 0})
        .sort("created_at", -1)
        .limit(limit)
        .to_list(limit)
    )

    for order in orders:
        for field in ["created_at", "shipped_at", "delivered_at", "received_at"]:
            if isinstance(order.get(field), str):
                order[field] = datetime.fromisoformat(order[field])
        # Ensure tracking_code exists for older orders
        if "tracking_code" not in order:
            order["tracking_code"] = order["id"][:8].upper()

    return orders


@api_router.put("/admin/orders/{order_id}/status")
async def update_order_status(
    order_id: str, status: OrderStatus, admin: Dict = Depends(require_admin)
):
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    now = datetime.now(timezone.utc)
    update_data = {"status": status.value}

    # Set timestamp based on status
    if status == OrderStatus.SHIPPED:
        update_data["shipped_at"] = now.isoformat()
    elif status == OrderStatus.DELIVERED:
        update_data["delivered_at"] = now.isoformat()
    elif status == OrderStatus.RECEIVED:
        update_data["received_at"] = now.isoformat()

    result = await db.orders.update_one({"id": order_id}, {"$set": update_data})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")

    # Send email notification based on status change
    customer_email = order.get("customer_email")
    if customer_email:
        order_updated = {**order, **update_data}
        if status == OrderStatus.SHIPPED:
            await send_order_email(
                customer_email,
                f"Votre commande {order.get('tracking_code', order_id[:8].upper())} a été expédiée",
                get_shipping_email(order_updated),
            )
        elif status == OrderStatus.DELIVERED:
            await send_order_email(
                customer_email,
                f"Votre commande {order.get('tracking_code', order_id[:8].upper())} a été livrée",
                get_delivered_email(order_updated),
            )

    return {"message": "Order status updated"}


@api_router.put("/admin/orders/{order_id}")
async def update_order(
    order_id: str, update: OrderUpdateAdmin, admin: Dict = Depends(require_admin)
):
    """Update order details (tracking number, carrier, notes)"""
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    update_data = {}
    now = datetime.now(timezone.utc)

    if update.status is not None:
        update_data["status"] = update.status.value
        if update.status == OrderStatus.SHIPPED:
            update_data["shipped_at"] = now.isoformat()
        elif update.status == OrderStatus.DELIVERED:
            update_data["delivered_at"] = now.isoformat()
        elif update.status == OrderStatus.RECEIVED:
            update_data["received_at"] = now.isoformat()

    if update.tracking_number is not None:
        update_data["tracking_number"] = update.tracking_number
    if update.carrier is not None:
        update_data["carrier"] = update.carrier
    if update.admin_notes is not None:
        update_data["admin_notes"] = update.admin_notes

    if update_data:
        await db.orders.update_one({"id": order_id}, {"$set": update_data})

    return {"message": "Order updated"}

@api_router.delete("/admin/orders/{order_id}")
async def delete_order(order_id: str, admin: Dict = Depends(require_admin)):
    """Delete an order permanently"""
    result = await db.orders.delete_one({"id": order_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Also delete related payment transactions
    await db.payment_transactions.delete_many({"order_id": order_id})
    
    return {"message": "Order deleted"}

@api_router.post("/admin/orders/{order_id}/archive")
async def archive_order(order_id: str, admin: Dict = Depends(require_admin)):
    """Archive an order"""
    result = await db.orders.update_one(
        {"id": order_id},
        {"$set": {"is_archived": True, "archived_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"message": "Order archived"}

@api_router.post("/admin/orders/{order_id}/unarchive")
async def unarchive_order(order_id: str, admin: Dict = Depends(require_admin)):
    """Unarchive an order"""
    result = await db.orders.update_one(
        {"id": order_id},
        {"$set": {"is_archived": False}, "$unset": {"archived_at": ""}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"message": "Order unarchived"}



@api_router.get("/admin/orders/{order_id}/print")
async def get_order_for_print(order_id: str, admin: Dict = Depends(require_admin)):
    """Get order details for printing preparation sheet"""
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Parse dates
    for field in ["created_at", "shipped_at", "delivered_at", "received_at"]:
        if isinstance(order.get(field), str):
            order[field] = datetime.fromisoformat(order[field])

    # Get full product details for each item
    items_with_full_details = []
    for item in order["items"]:
        product = await db.products.find_one({"id": item["product_id"]}, {"_id": 0})
        if product:
            items_with_full_details.append(
                {
                    **item,
                    "classification_id": product.get("classification_id")
                    or item.get("classification_id"),
                    "image_url": product.get("image_url") or item.get("image_url"),
                    "country": product.get("country"),
                    "year": product.get("year"),
                    "condition": product.get("condition"),
                }
            )
        else:
            items_with_full_details.append(item)

    order["items"] = items_with_full_details
    return order


@api_router.get("/admin/orders/{order_id}/pdf")
async def download_order_pdf(order_id: str, admin: Dict = Depends(require_admin)):
    """Download order preparation sheet as PDF - optimized to fit on one page"""
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Get full product details
    items_with_details = []
    for item in order["items"]:
        product = await db.products.find_one({"id": item["product_id"]}, {"_id": 0})
        if product:
            items_with_details.append(
                {
                    **item,
                    "classification_id": product.get("classification_id")
                    or item.get("classification_id", "N/A"),
                    "country": product.get("country", ""),
                    "year": product.get("year", ""),
                }
            )
        else:
            items_with_details.append(item)

    # Create PDF - reduced margins to fit more content
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=1.5*cm, leftMargin=1.5*cm, topMargin=1.5*cm, bottomMargin=1*cm)

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=16, spaceAfter=10, textColor=colors.HexColor('#8B1538'))
    heading2_style = ParagraphStyle('H2', parent=styles['Heading2'], fontSize=11, spaceBefore=8, spaceAfter=4)
    small_style = ParagraphStyle('Small', parent=styles['Normal'], fontSize=9)

    elements = []

    # Title
    tracking_code = order.get("tracking_code", order["id"][:8].upper())
    elements.append(Paragraph(f"FICHE DE PRÉPARATION - {tracking_code}", title_style))

    # Order info and shipping side by side
    created_at = order.get("created_at", "")
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at)
    date_str = created_at.strftime("%d/%m/%Y %H:%M") if created_at else ""

    shipping = order.get("shipping_info", {})
    
    info_shipping_data = [
        [
            Paragraph(f"<b>Date:</b> {date_str}<br/><b>Email:</b> {order.get('customer_email', 'N/A')}<br/><b>Paiement:</b> {order.get('payment_method', '').upper()}", small_style),
            Paragraph(f"<b>LIVRAISON</b><br/>{shipping.get('name', '')}<br/>{shipping.get('address', '')}<br/>{shipping.get('postal_code', '')} {shipping.get('city', '')}<br/><b>{shipping.get('country', '')}</b>", small_style)
        ]
    ]
    info_shipping_table = Table(info_shipping_data, colWidths=[9*cm, 9*cm])
    info_shipping_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(info_shipping_table)
    elements.append(Spacer(1, 0.3*cm))

    # Items table
    elements.append(Paragraph("ARTICLES À PRÉPARER", heading2_style))

    items_data = [["ID Classification", "Article", "Qté", "Prix"]]
    for item in items_with_details:
        items_data.append(
            [
                Paragraph(item.get("classification_id", "N/A"), small_style),
                Paragraph(item.get("name", "")[:50], small_style),
                str(item.get("quantity", 1)),
                f"{item.get('price', 0):.2f} €",
            ]
        )
    items_data.append(["", "", "TOTAL:", f"{order.get('total', 0):.2f} €"])

    items_table = Table(items_data, colWidths=[4*cm, 8*cm, 1.5*cm, 2.5*cm])
    items_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#8B1538")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('GRID', (0, 0), (-1, -2), 0.5, colors.grey),
                ("ALIGN", (2, 0), (-1, -1), "CENTER"),
                ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
                ('TOPPADDING', (0, 0), (-1, -1), 5),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ]
        )
    )
    elements.append(items_table)
    elements.append(Spacer(1, 0.4*cm))

    # Checklist in two columns
    elements.append(Paragraph("CHECKLIST", heading2_style))
    checklist_data = [
        ["☐ Articles vérifiés", "☐ Emballage protection", "☐ Numéro de suivi"],
        ["☐ État contrôlé", "☐ Étiquette adresse", "☐ Colis pesé"]
    ]
    checklist_table = Table(checklist_data, colWidths=[6*cm, 6*cm, 6*cm])
    checklist_table.setStyle(TableStyle([
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    elements.append(checklist_table)
    elements.append(Spacer(1, 0.4*cm))

    # Tracking number space - compact
    elements.append(Paragraph("SUIVI POSTAL", heading2_style))
    tracking_data = [
        ["N° de suivi: ________________________________", "Transporteur: ____________________", "Date: __________"]
    ]
    tracking_table = Table(tracking_data, colWidths=[7*cm, 6*cm, 5*cm])
    tracking_table.setStyle(TableStyle([
        ('FONTSIZE', (0, 0), (-1, -1), 9),
    ]))
    elements.append(tracking_table)

    doc.build(elements)
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=preparation_{tracking_code}.pdf"
        },
    )


@api_router.get("/orders/track/{tracking_code}/pdf")
async def download_customer_order_pdf(tracking_code: str):
    """Download customer order summary as PDF"""
    order = await db.orders.find_one({"tracking_code": tracking_code}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Commande non trouvée")

    # Create PDF
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=2 * cm,
        leftMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "Title",
        parent=styles["Heading1"],
        fontSize=20,
        spaceAfter=20,
        textColor=colors.HexColor("#8B1538"),
        alignment=1,
    )

    elements = []

    # Header
    elements.append(Paragraph("RÉCAPITULATIF DE COMMANDE", title_style))
    elements.append(
        Paragraph(
            f"Code de suivi: <b>{tracking_code}</b>",
            ParagraphStyle("Center", parent=styles["Normal"], alignment=1, fontSize=14),
        )
    )
    elements.append(Spacer(1, 1 * cm))

    # Order info
    created_at = order.get("created_at", "")
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at)
    date_str = created_at.strftime("%d/%m/%Y") if created_at else ""

    status_labels = {
        "pending": "En attente",
        "paid": "Payée",
        "preparing": "En préparation",
        "shipped": "Expédiée",
        "delivered": "Livrée",
        "received": "Reçue",
    }
    status = status_labels.get(order.get("status", ""), order.get("status", ""))

    info_data = [["Date:", date_str], ["Statut:", status]]
    if order.get("tracking_number"):
        info_data.append(["N° suivi transporteur:", order.get("tracking_number", "")])
        info_data.append(["Transporteur:", order.get("carrier", "")])

    info_table = Table(info_data, colWidths=[5 * cm, 10 * cm])
    info_table.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 11),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    elements.append(info_table)
    elements.append(Spacer(1, 0.5 * cm))

    # Shipping address
    elements.append(Paragraph("Adresse de livraison", styles["Heading2"]))
    shipping = order.get("shipping_info", {})
    address_text = f"""
    {shipping.get('name', '')}<br/>
    {shipping.get('address', '')}<br/>
    {shipping.get('postal_code', '')} {shipping.get('city', '')}<br/>
    {shipping.get('country', '')}
    """
    elements.append(Paragraph(address_text, styles["Normal"]))
    elements.append(Spacer(1, 0.5 * cm))

    # Items table
    elements.append(Paragraph("Articles commandés", styles["Heading2"]))

    items_data = [["Article", "Quantité", "Prix"]]
    for item in order.get("items", []):
        items_data.append(
            [
                item.get("name", ""),
                str(item.get("quantity", 1)),
                f"{item.get('price', 0):.2f} €",
            ]
        )
    items_data.append(["", "Total:", f"{order.get('total', 0):.2f} €"])

    items_table = Table(items_data, colWidths=[9 * cm, 3 * cm, 4 * cm])
    items_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#8B1538")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 10),
                ("GRID", (0, 0), (-1, -2), 1, colors.lightgrey),
                ("ALIGN", (1, 0), (-1, -1), "CENTER"),
                ("FONTNAME", (1, -1), (-1, -1), "Helvetica-Bold"),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    elements.append(items_table)

    elements.append(Spacer(1, 2 * cm))
    elements.append(
        Paragraph(
            f"Merci pour votre confiance ! - {SITE_NAME}",
            ParagraphStyle(
                "Footer", parent=styles["Normal"], alignment=1, textColor=colors.grey
            ),
        )
    )

    doc.build(elements)
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=commande_{tracking_code}.pdf"
        },
    )


@api_router.get("/admin/stats")
async def get_admin_stats(admin: Dict = Depends(require_admin)):
    # Product stats by type
    stamps_count = await db.products.count_documents({"product_type": "meme", "is_sold": False})
    envelopes_count = await db.products.count_documents({"product_type": "modern", "is_sold": False})
    custom_count = await db.products.count_documents({"product_type": "custom", "is_sold": False})
    total_products = await db.products.count_documents({})
    available_products = await db.products.count_documents({"is_sold": False})
    sold_out_products = await db.products.count_documents({"is_sold": True})

    # Nombre d'unités réellement vendues (commandes payées) : plus pertinent que
    # "produits en rupture totale", qui n'arrive presque jamais en stock illimité.
    units_pipeline = [
        {"$match": {"payment_status": PaymentStatus.COMPLETED.value}},
        {"$unwind": "$items"},
        {"$group": {"_id": None, "total_units": {"$sum": "$items.quantity"}}},
    ]
    units_result = await db.orders.aggregate(units_pipeline).to_list(1)
    units_sold = units_result[0]["total_units"] if units_result else 0

    # Low stock products (stock <= 2)
    low_stock = await db.products.count_documents({"stock_quantity": {"$lte": 2}, "is_sold": False, "unlimited_stock": {"$ne": True}})
    
    # Order stats - exclude archived from active counts
    total_orders = await db.orders.count_documents({"is_archived": {"$ne": True}})
    archived_orders = await db.orders.count_documents({"is_archived": True})
    paid_orders = await db.orders.count_documents({"payment_status": PaymentStatus.COMPLETED.value, "is_archived": {"$ne": True}})
    pending_orders = await db.orders.count_documents({"payment_status": PaymentStatus.PENDING.value, "is_archived": {"$ne": True}})
    preparing_orders = await db.orders.count_documents({"status": OrderStatus.PREPARING.value, "is_archived": {"$ne": True}})
    shipped_orders = await db.orders.count_documents({"status": OrderStatus.SHIPPED.value, "is_archived": {"$ne": True}})
    received_orders = await db.orders.count_documents({"status": OrderStatus.RECEIVED.value})

    # Calculate revenue
    pipeline = [
        {"$match": {"payment_status": PaymentStatus.COMPLETED.value}},
        {"$group": {"_id": None, "total": {"$sum": "$total"}}},
    ]
    revenue_result = await db.orders.aggregate(pipeline).to_list(1)
    total_revenue = revenue_result[0]["total"] if revenue_result else 0

    return {
        "products": {
            "total": total_products,
            "available": available_products,
            "sold": units_sold,
            "sold_out": sold_out_products,
            "meme": stamps_count,
            "modern": envelopes_count,
            "custom": custom_count,
            "low_stock": low_stock
        },
        "orders": {
            "total": total_orders,
            "archived": archived_orders,
            "paid": paid_orders,
            "pending": pending_orders,
            "preparing": preparing_orders,
            "shipped": shipped_orders,
            "received": received_orders
        },
        "revenue": round(total_revenue, 2),
    }


# ============== ROOT ROUTE ==============
@api_router.get("/")
async def root():
    return {"message": "MemeWear API", "version": "1.0.0"}


# ============== CATEGORIES & STYLES (gérés depuis l'admin) ==============
@api_router.get("/categories", response_model=List[TaxonomyResponse])
async def get_categories():
    items = await db.categories.find({}, {"_id": 0}).sort("name", 1).to_list(500)
    return items


@api_router.post("/categories", response_model=TaxonomyResponse)
async def create_category(item: TaxonomyItem, admin: Dict = Depends(require_admin)):
    name = item.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Nom requis")
    existing = await db.categories.find_one({"name": {"$regex": f"^{name}$", "$options": "i"}})
    if existing:
        raise HTTPException(status_code=400, detail="Cette catégorie existe déjà")
    doc = {"id": str(uuid.uuid4()), "name": name}
    await db.categories.insert_one(doc)
    return doc


@api_router.delete("/categories/{item_id}")
async def delete_category(item_id: str, admin: Dict = Depends(require_admin)):
    result = await db.categories.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Catégorie introuvable")
    return {"message": "Catégorie supprimée"}


@api_router.get("/styles", response_model=List[TaxonomyResponse])
async def get_styles():
    items = await db.styles.find({}, {"_id": 0}).sort("name", 1).to_list(500)
    return items


@api_router.post("/styles", response_model=TaxonomyResponse)
async def create_style(item: TaxonomyItem, admin: Dict = Depends(require_admin)):
    name = item.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Nom requis")
    existing = await db.styles.find_one({"name": {"$regex": f"^{name}$", "$options": "i"}})
    if existing:
        raise HTTPException(status_code=400, detail="Ce style existe déjà")
    doc = {"id": str(uuid.uuid4()), "name": name}
    await db.styles.insert_one(doc)
    return doc


@api_router.delete("/styles/{item_id}")
async def delete_style(item_id: str, admin: Dict = Depends(require_admin)):
    result = await db.styles.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Style introuvable")
    return {"message": "Style supprimé"}


@api_router.get("/colors", response_model=List[TaxonomyResponse])
async def get_colors():
    items = await db.colors.find({}, {"_id": 0}).sort("name", 1).to_list(500)
    return items


@api_router.post("/colors", response_model=TaxonomyResponse)
async def create_color(item: TaxonomyItem, admin: Dict = Depends(require_admin)):
    name = item.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Nom requis")
    existing = await db.colors.find_one({"name": {"$regex": f"^{name}$", "$options": "i"}})
    if existing:
        raise HTTPException(status_code=400, detail="Cette couleur existe déjà")
    doc = {"id": str(uuid.uuid4()), "name": name}
    await db.colors.insert_one(doc)
    return doc


@api_router.delete("/colors/{item_id}")
async def delete_color(item_id: str, admin: Dict = Depends(require_admin)):
    result = await db.colors.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Couleur introuvable")
    return {"message": "Couleur supprimée"}


# CORS must be added BEFORE including router
cors_origins = os.environ.get("CORS_ORIGINS", "*").split(",")
# Clean up origins (remove whitespace)
cors_origins = [origin.strip() for origin in cors_origins if origin.strip()]
logger.info(f"CORS origins configured: {cors_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=cors_origins if cors_origins and cors_origins != ["*"] else ["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Include router AFTER middleware
app.include_router(api_router)


@app.get("/")
async def app_root():
    return {
        "service": "MemeWear API",
        "version": "1.2.1",
        "status": "online",
        "api_docs": "/docs",
        "api_base": "/api",
    }


@app.on_event("startup")
async def start_pending_orders_cleanup():
    """Supprime automatiquement les commandes en attente de paiement laissées
    à l'abandon (client qui ferme l'onglet sans annuler ni payer)."""
    async def cleanup_loop():
        while True:
            try:
                cutoff = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
                stale = await db.orders.find(
                    {"payment_status": PaymentStatus.PENDING.value, "created_at": {"$lt": cutoff}},
                    {"id": 1},
                ).to_list(1000)
                if stale:
                    ids = [o["id"] for o in stale]
                    await db.orders.delete_many({"id": {"$in": ids}})
                    await db.payment_transactions.delete_many({"order_id": {"$in": ids}})
                    logger.info(f"Nettoyage: {len(ids)} commande(s) en attente abandonnée(s) supprimée(s)")
            except Exception as e:
                logger.error(f"Erreur nettoyage commandes en attente: {e}")
            await asyncio.sleep(3600)  # toutes les heures

    asyncio.create_task(cleanup_loop())


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()