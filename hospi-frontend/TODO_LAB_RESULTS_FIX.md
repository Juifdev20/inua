# TODO: Fix Lab Results Empty List (Prendre en Charge → Saisi Résultats)

## ✅ PLAN APPROVED - Implementation Steps

### 1. [ ] Fix LabQueue.jsx Navigation
   - Add patientId to URL: `/labo/results/${patientId}`
   - Ensure state has patientId, allTests
   - Stable localStorage structure

### 2. [ ] Fix LabResults.jsx Data Loading
   - Priority load: location.state → localStorage → backend
   - Normalize {patient, patientId, allTests: []}
   - Fix useEffect guards/deps
   - Unique keys, logging
   - Cleanup storage

### 3. [ ] Test Flow
   - npm run dev
   - Queue → Prendre en charge → Verify list loads
   - Check console logs
   - Refresh page → Backend fallback
   - Fill form → Submit

### 4. [x] Create this TODO.md

**Status: Starting step 1**
