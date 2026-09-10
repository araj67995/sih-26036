# Online Verification System for Weighing and Measuring Instruments
### Smart India Hackathon (SIH) Problem Statement ID: 26036
**Legal Metrology Division — Ministry of Consumer Affairs, Food & Public Distribution**

---

> [!NOTE]
> **Prototype / Demonstration Implementation Notice**  
> This web application is a full-stack functional prototype developed to address SIH Problem Statement ID 26036. It simulates the digitized verification, inspection, and certification workflow of weighing and measuring instruments under the Legal Metrology Act, 2009.

---

## 🏛️ System Features by Stakeholder Role

### 1. Applicant / Business Portal
- **Registration & Authentication:** Secure applicant registration with automatic establishment profile generation.
- **Instrument Management:** Register commercial instruments with stamped serial numbers, rated capacities, and physical premise locations.
- **Verification Application Workflow:** Apply for initial verification, periodic re-verification, or post-repair calibration with document attachments.
- **Interactive Lifecycle Tracking:** 6-stage visual timeline tracker displaying review, schedule, officer remarks, and inspection results.
- **Digital Certificate Downloads:** Download official PDF verification certificates with embedded QR codes.

### 2. Legal Metrology Officer (Inspector) Console
- **Assigned Queue:** Review applications allocated to the officer or available for district pickup.
- **Document Scrutiny:** Scrutinize purchase invoices and model approval slips (Approve for Inspection or Reject with reasons).
- **Inspection Scheduling:** Schedule physical on-site or laboratory inspection dates with venue instructions.
- **Interactive Metrological Calculator:**
  - Standard reference weight input
  - Observed instrument reading input
  - Maximum Permissible Error (MPE) input
  - Real-time computation: $\text{Error} = \text{Observed} - \text{Standard}$, $\text{Absolute Error} = |\text{Error}|$, and instant **PASS** or **FAIL** compliance decision.
- **One-Click Certificate Generation:** Generates official PDF certificate via PDFKit with QR code and cryptographic verification token.

### 3. Central & State Administrator Console
- **Analytics Dashboard:** Recharts visualizations of application volume by status, inspection pass rates, and district metrics.
- **Workload Balancing:** Allocate and reassign applications to Legal Metrology Officers.
- **User Management:** View all applicants and officers, toggle account status (Active / Suspended).
- **Accredited Test Centres:** Register and manage calibration laboratories and secondary standards stations.
- **Immutable Audit Trail:** Comprehensive chronological log capturing actor, action, previous status, new status, and timestamp.

### 4. Public Certificate Verification (No Login Required)
- **Instant Citizen Verification:** Access via URL `/verify/:certificateNumber` or by scanning the physical calibration QR sticker.
- **Clear Status Display:** Displays **&#10003; VALID CERTIFICATE**, **&#9888; CERTIFICATE EXPIRED**, or **&#10005; CERTIFICATE NOT FOUND**.
- **Privacy Protection:** Displays instrument specifications, validity dates, and issuing officer without exposing sensitive applicant phone numbers or passwords.

---

## 🔑 Demo Login Credentials (Ready in MongoDB)

| Role | Email | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **Applicant** | `applicant@demo.com` | `Password@123` | Gupta Kirana & General Store (Instruments, Applications, Certificates) |
| **Officer** | `officer1@metrology.gov.in` | `Officer@123` | Inspector Rajesh Sharma (Review, Schedule, Inspect, Issue Certs) |
| **Officer 2** | `officer2@metrology.gov.in` | `Officer@123` | Inspector Ananya Sen |
| **Admin** | `admin@metrology.gov.in` | `Admin@123` | Dr. K. S. Verma (Analytics, Allocation, Audit Logs, Users) |

Sample Verified Certificate Numbers for Public Verification:
- `LM-DL-2026-000001`
- `LM-DL-2026-000002`
- `LM-DL-2026-000003`

---

## ⚙️ Running the Application

### 1. Backend Server
```bash
cd backend
npm install
npm run dev
```
Backend runs on `http://localhost:5000`.

### 2. Frontend Client
```bash
cd frontend
npm install
npm run dev
```
Frontend runs on `http://localhost:5173`.

### 3. Re-seeding Database (Optional)
To reset and re-populate the MongoDB database with demo data:
```bash
cd backend
node src/scripts/seed.js
```

### 4. Running Automated End-to-End Verification Test
```bash
cd backend
node src/scripts/verifyE2E.js
```
