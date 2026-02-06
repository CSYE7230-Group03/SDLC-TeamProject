# Backend Project Structure

```text
backend/
│
├── ai-service/               # Python microservice for AI / image processing
│   ├── app.py                # Entry point of Python microservice
│   └── requirements.txt      # Python dependencies (Flask/FastAPI, TensorFlow, etc.)
│
└── api-service/              # Node.js backend (Express)
    ├── src/
    │   ├── controllers/      # Handles API request logic
    │   ├── routes/           # Defines API endpoints
    │   ├── services/         # Business logic / helper functions
    │   └── app.js            # Entry point of Node.js backend (Express server)
    ├── package.json
    ├── package-lock.json
    ├── .gitignore
    └── README.md
```

### Run backend/api-service:

```bash
#navigate to the right folder
cd backend/api-service

#install dependencies
npm install

#run app
node src/app.js
```

### Run backend/ai-service:

```bash
#navigate to the right folder
cd backend/ai-service

#Create/Activate venv
python3 -m venv venv
source venv/bin/activate   # Mac/Linux
# venv\Scripts\activate    # Windows

#run app 
uvicorn app:app --reload --port 8000
```

