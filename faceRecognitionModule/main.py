from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import os
import uuid
from datetime import datetime
from PIL import Image
import base64
import io
from typing import Optional
import uvicorn
from FaceRecognition import faceRecognitionModule

app = FastAPI(title="Profile Picture Upload API", version="1.0.0")

# CORS middleware to allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://localhost:3001", 
        "http://localhost:5173",  # Vite dev server
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173"   # Vite dev server
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
UPLOAD_FOLDER = 'profilePicture'
LIVE_CAM_FOLDER = 'liveCamphotos'  # New folder for live camera photos
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

# Ensure upload folders exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(LIVE_CAM_FOLDER, exist_ok=True)

def allowed_file(filename: str) -> bool:
    """Check if file extension is allowed"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def validate_image(file_content: bytes) -> tuple[bool, str]:
    """Validate image file"""
    try:
        # Read image with PIL
        image = Image.open(io.BytesIO(file_content))
        
        # Check image dimensions
        width, height = image.size
        if width < 50 or height < 50:
            return False, "Image too small (minimum 50x50 pixels)"
        if width > 5000 or height > 5000:
            return False, "Image too large (maximum 5000x5000 pixels)"
            
        return True, "Valid image"
    except Exception as e:
        return False, f"Invalid image file: {str(e)}"

@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "Profile Picture Upload API", "status": "running"}

@app.post("/upload-profile-picture")
async def upload_profile_picture(
    profilePhoto: UploadFile = File(...),
    userId: Optional[str] = Form(None)
):
    """Upload profile picture endpoint"""
    try:
        # Check if file is provided
        if not profilePhoto.filename:
            raise HTTPException(status_code=400, detail="No file provided")
        
        # Check file extension
        if not allowed_file(profilePhoto.filename):
            raise HTTPException(
                status_code=400, 
                detail="Invalid file type. Only PNG, JPG, JPEG, and GIF files are allowed"
            )
        
        # Read file content
        file_content = await profilePhoto.read()
        
        # Check file size
        if len(file_content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400, 
                detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB"
            )
        
        # Validate image
        is_valid, message = validate_image(file_content)
        if not is_valid:
            raise HTTPException(status_code=400, detail=message)
        
        # Generate unique filename
        file_extension = profilePhoto.filename.rsplit('.', 1)[1].lower()
        unique_filename = f"{uuid.uuid4()}.{file_extension}"
        
        # Save file
        file_path = os.path.join(UPLOAD_FOLDER, unique_filename)
        with open(file_path, "wb") as f:
            f.write(file_content)
        
        # Get file info
        file_size = os.path.getsize(file_path)
        
        # Get image dimensions
        with Image.open(file_path) as img:
            width, height = img.size
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "message": "Profile picture uploaded successfully",
                "data": {
                    "filename": unique_filename,
                    "original_filename": profilePhoto.filename,
                    "file_path": file_path,
                    "file_size": file_size,
                    "dimensions": {
                        "width": width,
                        "height": height
                    },
                    "upload_time": datetime.now().isoformat(),
                    "user_id": userId
                }
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading profile picture: {str(e)}")

@app.post("/upload-profile-picture-base64")
async def upload_profile_picture_base64(
    imageData: str = Form(...),
    imageType: Optional[str] = Form("image/jpeg"),
    userId: Optional[str] = Form(None)
):
    """Upload profile picture from base64 data (for frontend integration)"""
    try:
        # Extract base64 data
        if imageData.startswith('data:image'):
            # Remove data URL prefix
            image_data = imageData.split(',')[1]
        else:
            image_data = imageData
        
        # Decode base64
        try:
            image_bytes = base64.b64decode(image_data)
        except Exception as e:
            raise HTTPException(status_code=400, detail="Invalid base64 image data")
        
        # Create PIL Image from bytes
        try:
            image = Image.open(io.BytesIO(image_bytes))
        except Exception as e:
            raise HTTPException(status_code=400, detail="Invalid image format")
        
        # Validate image
        width, height = image.size
        if width < 50 or height < 50:
            raise HTTPException(status_code=400, detail="Image too small (minimum 50x50 pixels)")
        if width > 5000 or height > 5000:
            raise HTTPException(status_code=400, detail="Image too large (maximum 5000x5000 pixels)")
        
        # Generate unique filename
        file_extension = 'jpg'  # Default to jpg for base64
        if 'image/png' in imageType:
            file_extension = 'png'
        elif 'image/gif' in imageType:
            file_extension = 'gif'
        
        unique_filename = f"{uuid.uuid4()}.{file_extension}"
        
        # Save file
        file_path = os.path.join(UPLOAD_FOLDER, unique_filename)
        image.save(file_path, format='JPEG' if file_extension == 'jpg' else file_extension.upper())
        
        # Get file info
        file_size = os.path.getsize(file_path)
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "message": "Profile picture uploaded successfully",
                "data": {
                    "filename": unique_filename,
                    "file_path": file_path,
                    "file_size": file_size,
                    "dimensions": {
                        "width": width,
                        "height": height
                    },
                    "upload_time": datetime.now().isoformat(),
                    "user_id": userId
                }
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading profile picture: {str(e)}")

@app.post("/upload-live-cam-photo")
async def upload_live_cam_photo(
    liveCamPhoto: UploadFile = File(...),
    userId: Optional[str] = Form(None)
):
    """Upload live camera photo endpoint"""
    try:
        # Check if file is provided
        if not liveCamPhoto.filename:
            raise HTTPException(status_code=400, detail="No file provided")
        
        # Check file extension
        if not allowed_file(liveCamPhoto.filename):
            raise HTTPException(
                status_code=400, 
                detail="Invalid file type. Only PNG, JPG, JPEG, and GIF files are allowed"
            )
        
        # Read file content
        file_content = await liveCamPhoto.read()
        
        # Check file size
        if len(file_content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400, 
                detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB"
            )
        
        # Validate image
        is_valid, message = validate_image(file_content)
        if not is_valid:
            raise HTTPException(status_code=400, detail=message)
        
        # Generate unique filename
        file_extension = liveCamPhoto.filename.rsplit('.', 1)[1].lower()
        unique_filename = f"livecam_{uuid.uuid4()}.{file_extension}"
        
        # Save file
        file_path = os.path.join(LIVE_CAM_FOLDER, unique_filename)
        with open(file_path, "wb") as f:
            f.write(file_content)
        
        # Get file info
        file_size = os.path.getsize(file_path)
        
        # Get image dimensions
        with Image.open(file_path) as img:
            width, height = img.size
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "message": "Live camera photo uploaded successfully",
                "data": {
                    "filename": unique_filename,
                    "original_filename": liveCamPhoto.filename,
                    "file_path": file_path,
                    "file_size": file_size,
                    "dimensions": {
                        "width": width,
                        "height": height
                    },
                    "upload_time": datetime.now().isoformat(),
                    "user_id": userId
                }
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading live camera photo: {str(e)}")

@app.post("/face-recognition")
async def face_recognition(
    profilePhotoPath   : str = Form(...),
    liveCamPhotoPath: str = Form(...)
):
    """Face recognition endpoint"""
    try:
        profilePhotoPath = profilePhotoPath.split("/")[-1]
        liveCamPhotoPath = liveCamPhotoPath.split("/")[-1]
        profilePhotoPath = os.path.join(UPLOAD_FOLDER, profilePhotoPath)
        liveCamPhotoPath = os.path.join(LIVE_CAM_FOLDER, liveCamPhotoPath)
        result = faceRecognitionModule(profilePhotoPath, liveCamPhotoPath)
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "message": "Face recognition successful",
                "data": {
                    "result": result
                }
            }
        )
        
    except HTTPException:
        raise
# @app.get("/profile-pictures")
# async def list_profile_pictures():
#     """List all uploaded profile pictures"""
#     try:
#         files = []
#         for filename in os.listdir(UPLOAD_FOLDER):
#             if allowed_file(filename):
#                 file_path = os.path.join(UPLOAD_FOLDER, filename)
#                 file_size = os.path.getsize(file_path)
#                 file_time = os.path.getmtime(file_path)
                
#                 files.append({
#                     "filename": filename,
#                     "file_size": file_size,
#                     "upload_time": datetime.fromtimestamp(file_time).isoformat()
#                 })
        
#         return JSONResponse(
#             status_code=200,
#             content={
#                 "success": True,
#                 "data": files
#             }
#         )
        
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Error listing profile pictures: {str(e)}")

# @app.get("/profile-picture/{filename}")
# async def get_profile_picture(filename: str):
#     """Get a specific profile picture info"""
#     try:
#         file_path = os.path.join(UPLOAD_FOLDER, filename)
        
#         if not os.path.exists(file_path):
#             raise HTTPException(status_code=404, detail="Profile picture not found")
        
#         file_size = os.path.getsize(file_path)
#         file_time = os.path.getmtime(file_path)
        
#         with Image.open(file_path) as img:
#             width, height = img.size
        
#         return JSONResponse(
#             status_code=200,
#             content={
#                 "success": True,
#                 "data": {
#                     "filename": filename,
#                     "file_path": file_path,
#                     "file_size": file_size,
#                     "dimensions": {
#                         "width": width,
#                         "height": height
#                     },
#                     "upload_time": datetime.fromtimestamp(file_time).isoformat()
#                 }
#             }
#         )
        
#     except HTTPException:
#         raise
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Error getting profile picture: {str(e)}")

# @app.delete("/profile-picture/{filename}")
# async def delete_profile_picture(filename: str):
#     """Delete a specific profile picture"""
#     try:
#         file_path = os.path.join(UPLOAD_FOLDER, filename)
        
#         if not os.path.exists(file_path):
#             raise HTTPException(status_code=404, detail="Profile picture not found")
        
#         os.remove(file_path)
        
#         return JSONResponse(
#             status_code=200,
#             content={
#                 "success": True,
#                 "message": "Profile picture deleted successfully"
#             }
#         )
        
#     except HTTPException:
#         raise
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Error deleting profile picture: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
