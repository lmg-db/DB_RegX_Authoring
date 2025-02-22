# Medical Word Add-in

A Microsoft Word add-in for medical document processing with AI capabilities.

## Prerequisites

### Frontend Requirements
- Node.js (v16+)
- npm (v8+)
- Microsoft Office (Word)
- SSL certificates for local development

### Backend Requirements
- Python 3.9+
- pip
- SSL certificates for HTTPS

pip install -r requirements.txt

Backend Setup:
uvicorn main:app --reload --port 8000 --host 0.0.0.0 --ssl-certfile localhost.crt --ssl-keyfile localhost.key

Frontend Setup:
npm run start

Launch Word Add-in:
office-addin-debugging start manifest.xml --app word --document "path/to/your/document.docx"


