import io

def test_upload_image_success(client, consumer_headers):
    # Create a minimal valid JPEG
    image_data = io.BytesIO(b'\xff\xd8\xff\xe0' + b'\x00' * 100)  # JPEG header
    image_data.name = 'test.jpg'
    
    response = client.post(
        "/api/uploads/image",
        headers=consumer_headers,
        files={"file": ("test.jpg", image_data, "image/jpeg")}
    )
    
    assert response.status_code == 201
    data = response.json()
    assert "url" in data
    assert data["url"].startswith("/uploads/items/")

def test_upload_image_invalid_type(client, consumer_headers):
    text_data = io.BytesIO(b'hello world')
    text_data.name = 'test.txt'
    
    response = client.post(
        "/api/uploads/image",
        headers=consumer_headers,
        files={"file": ("test.txt", text_data, "text/plain")}
    )
    
    assert response.status_code == 400
    assert "Only JPEG, PNG, WEBP or GIF images are allowed" in response.json()["detail"]

def test_upload_image_unauthenticated(client):
    image_data = io.BytesIO(b'\xff\xd8\xff\xe0' + b'\x00' * 100)
    image_data.name = 'test.jpg'
    
    response = client.post(
        "/api/uploads/image",
        files={"file": ("test.jpg", image_data, "image/jpeg")}
    )
    
    assert response.status_code == 401

def test_upload_returns_url(client, consumer_headers):
    image_data = io.BytesIO(b'\xff\xd8\xff\xe0' + b'\x00' * 100)
    image_data.name = 'test.jpg'
    
    response = client.post(
        "/api/uploads/image",
        headers=consumer_headers,
        files={"file": ("test.jpg", image_data, "image/jpeg")}
    )
    
    assert response.status_code == 201
    assert response.json()["url"].startswith("/uploads/items/")
