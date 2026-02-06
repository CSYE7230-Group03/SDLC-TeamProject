from fastapi import FastAPI

# Initialize FastAPI app
app = FastAPI(title="Replate Python Microservices")

# Root endpoint
@app.get("/")
def read_root():
    return {"message": "Python microservice is working!"}