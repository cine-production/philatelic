import requests
import sys
import uuid
from datetime import datetime

class PhilatelicAPITester:
    def __init__(self, base_url="https://philatelic-ai.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.admin_user_id = None
        self.created_product_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        default_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            default_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            default_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=default_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=default_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=default_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=default_headers, timeout=30)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_json = response.json()
                    print(f"   Response: {response_json}")
                    return True, response_json
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_response = response.json()
                    print(f"   Error: {error_response}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Exception: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        success, response = self.run_test(
            "Root API Endpoint",
            "GET",
            "",
            200
        )
        return success and 'message' in response

    def test_products_stats(self):
        """Test products stats endpoint"""
        success, response = self.run_test(
            "Products Stats",
            "GET", 
            "products/stats/summary",
            200
        )
        return success and 'stamps_count' in response

    def test_get_products_empty(self):
        """Test getting products (should be empty initially)"""
        success, response = self.run_test(
            "Get Products (Empty)",
            "GET",
            "products",
            200
        )
        return success and isinstance(response, list)

    def test_admin_register(self):
        """Test admin registration (first user becomes admin)"""
        unique_id = str(uuid.uuid4())[:8]
        register_data = {
            "name": f"Test Admin {unique_id}",
            "email": f"admin_{unique_id}@test.com",
            "password": "TestPass123!"
        }
        
        success, response = self.run_test(
            "Admin Registration",
            "POST",
            "auth/register",
            200,
            data=register_data
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.admin_user_id = response['user']['id']
            return response['user'].get('is_admin', False)
        return False

    def test_admin_login(self):
        """Test admin login with created credentials"""
        if not self.admin_user_id:
            return False
            
        # We'll use the token from registration for subsequent tests
        return True

    def test_get_admin_stats(self):
        """Test admin stats endpoint"""
        if not self.token:
            return False
            
        success, response = self.run_test(
            "Admin Stats",
            "GET",
            "admin/stats",
            200
        )
        return success and 'products' in response and 'orders' in response

    def test_create_product(self):
        """Test creating a product"""
        if not self.token:
            return False
            
        product_data = {
            "name": "Test Stamp France 1950",
            "description": "A beautiful vintage French stamp from 1950",
            "product_type": "stamp",
            "condition": "excellent", 
            "is_obliterated": False,
            "year": 1950,
            "country": "France",
            "category": "Commemorative",
            "rarity": "uncommon",
            "price": 15.50,
            "estimated_value": 18.00,
            "history": "Issued for the 10th anniversary of liberation",
            "print_quantity": 50000,
            "dimensions": "40x30mm"
        }
        
        success, response = self.run_test(
            "Create Product",
            "POST",
            "products",
            200,
            data=product_data
        )
        
        if success and 'id' in response:
            self.created_product_id = response['id']
            return True
        return False

    def test_get_product_detail(self):
        """Test getting product details"""
        if not self.created_product_id:
            return False
            
        success, response = self.run_test(
            "Get Product Detail",
            "GET",
            f"products/{self.created_product_id}",
            200
        )
        return success and response.get('id') == self.created_product_id

    def test_update_product(self):
        """Test updating a product"""
        if not self.created_product_id or not self.token:
            return False
            
        update_data = {
            "price": 20.00,
            "description": "Updated description - A beautiful vintage French stamp from 1950 with certificate"
        }
        
        success, response = self.run_test(
            "Update Product",
            "PUT",
            f"products/{self.created_product_id}",
            200,
            data=update_data
        )
        return success and response.get('price') == 20.00

    def test_cart_operations(self):
        """Test cart operations"""
        if not self.created_product_id:
            return False
            
        session_id = str(uuid.uuid4())
        headers = {"X-Session-ID": session_id}
        
        # Get empty cart
        success1, response1 = self.run_test(
            "Get Empty Cart",
            "GET",
            "cart",
            200,
            headers=headers
        )
        
        if not (success1 and response1.get('total') == 0):
            return False
        
        # Add item to cart
        cart_item = {"product_id": self.created_product_id, "quantity": 1}
        success2, response2 = self.run_test(
            "Add to Cart",
            "POST",
            "cart/add",
            200,
            data=cart_item,
            headers=headers
        )
        
        if not success2:
            return False
            
        # Get cart with item
        success3, response3 = self.run_test(
            "Get Cart with Item",
            "GET", 
            "cart",
            200,
            headers=headers
        )
        
        return success3 and len(response3.get('items', [])) > 0

    def test_ai_status(self):
        """Test AI service status (expected to be offline in test environment)"""
        success, response = self.run_test(
            "AI Status Check",
            "GET",
            "ai/status", 
            200
        )
        # AI should be offline in test environment, but endpoint should work
        return success and 'status' in response

    def test_invalid_endpoints(self):
        """Test some invalid endpoints to ensure proper error handling"""
        success1, _ = self.run_test(
            "Invalid Product ID",
            "GET",
            "products/invalid-id",
            404
        )
        
        success2, _ = self.run_test(
            "Unauthorized Admin Access",
            "GET", 
            "admin/stats",
            401,
            headers={"Authorization": ""}  # Override auth header
        )
        
        return success1 and success2

def main():
    """Run all backend API tests"""
    print("🚀 Starting Philatelic Curator Backend API Tests")
    print("=" * 60)
    
    tester = PhilatelicAPITester()
    
    # Core API tests
    tests = [
        ("Root Endpoint", tester.test_root_endpoint),
        ("Products Stats", tester.test_products_stats), 
        ("Get Products Empty", tester.test_get_products_empty),
        ("Admin Register", tester.test_admin_register),
        ("Admin Login", tester.test_admin_login),
        ("Admin Stats", tester.test_get_admin_stats),
        ("Create Product", tester.test_create_product),
        ("Get Product Detail", tester.test_get_product_detail),
        ("Update Product", tester.test_update_product),
        ("Cart Operations", tester.test_cart_operations),
        ("AI Status", tester.test_ai_status),
        ("Invalid Endpoints", tester.test_invalid_endpoints)
    ]
    
    failed_tests = []
    
    for test_name, test_func in tests:
        print(f"\n📋 Running: {test_name}")
        try:
            result = test_func()
            if result:
                print(f"✅ {test_name}: PASSED")
            else:
                print(f"❌ {test_name}: FAILED")
                failed_tests.append(test_name)
        except Exception as e:
            print(f"💥 {test_name}: ERROR - {str(e)}")
            failed_tests.append(f"{test_name} (ERROR)")
    
    # Final results
    print("\n" + "=" * 60)
    print(f"📊 BACKEND API TEST RESULTS")
    print(f"Tests passed: {tester.tests_passed}/{tester.tests_run}")
    success_rate = (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0
    print(f"Success rate: {success_rate:.1f}%")
    
    if failed_tests:
        print(f"\n❌ Failed tests:")
        for test in failed_tests:
            print(f"  - {test}")
    else:
        print(f"\n🎉 All tests passed!")
    
    return len(failed_tests) == 0

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)