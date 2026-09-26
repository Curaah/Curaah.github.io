// Supabase client initialisation + all app-wide constants.
// This file does NOT contain any utility functions.

const SUPABASE_URL  = 'https://lospowxozjnoiawxbojg.supabase.co';
const SUPABASE_ANON = 'sb_publishable_3MOLo2NQ0iSg6ynCYq62Kg_Hwp0a7Ex'; // ← paste from Supabase → Settings → API

window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
});

// ─────────────────────────────────────────────
// Domain constants used across the app
// ─────────────────────────────────────────────

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const PUNJAB_DISTRICTS = [
  'Amritsar', 'Barnala', 'Bathinda', 'Faridkot', 'Fatehgarh Sahib',
  'Fazilka', 'Ferozepur', 'Gurdaspur', 'Hoshiarpur', 'Jalandhar',
  'Kapurthala', 'Ludhiana', 'Malerkotla', 'Mansa', 'Moga',
  'Mohali (SAS Nagar)', 'Muktsar', 'Nawanshahr', 'Pathankot',
  'Patiala', 'Ropar (Rupnagar)', 'Sangrur',
  'Shaheed Bhagat Singh Nagar', 'Sri Muktsar Sahib', 'Tarn Taran',
];

const INDIA_STATES = [
  'Punjab', 'Haryana', 'Himachal Pradesh', 'Chandigarh (UT)',
  'Delhi', 'Rajasthan', 'Uttar Pradesh', 'Uttarakhand',
  'Maharashtra', 'Gujarat', 'Karnataka', 'Tamil Nadu',
  'Kerala', 'Telangana', 'Andhra Pradesh', 'West Bengal',
  'Bihar', 'Madhya Pradesh', 'Goa', 'Assam', 'Other',
];

const VOLUNTEER_SKILLS = [
  { id: 'first_aid',     label: 'First Aid / CPR' },
  { id: 'driving',       label: 'Driving (own vehicle)' },
  { id: 'data_entry',    label: 'Data Entry / Computer' },
  { id: 'nursing',       label: 'Nursing / Paramedic' },
  { id: 'teaching',      label: 'Teaching / Training' },
  { id: 'counseling',    label: 'Counseling / Support' },
  { id: 'photography',   label: 'Photography / Video' },
  { id: 'translation',   label: 'Translation (Hindi / Punjabi / English)' },
  { id: 'physical_work', label: 'Physical Labour / Setup' },
  { id: 'cooking',       label: 'Cooking / Langar Seva' },
  { id: 'medical',       label: 'Medical / Doctor' },
  { id: 'admin',         label: 'Administration / Planning' },
  { id: 'fundraising',   label: 'Fundraising / Finance' },
  { id: 'social_media',  label: 'Social Media / Marketing' },
];

const NGO_WORK_AREAS = [
  { id: 'diabetes',       label: 'Diabetes Management' },
  { id: 'hypertension',   label: 'Hypertension / Heart' },
  { id: 'cancer',         label: 'Cancer Support' },
  { id: 'blood_donation', label: 'Blood Donation Drives' },
  { id: 'palliative',     label: 'Palliative / End-of-Life' },
  { id: 'mental_health',  label: 'Mental Health' },
  { id: 'nutrition',      label: 'Nutrition / Malnutrition' },
  { id: 'eye_care',       label: 'Eye Care / Blindness' },
  { id: 'maternal',       label: 'Maternal & Child Health' },
  { id: 'rehabilitation', label: 'Rehabilitation / Disability' },
  { id: 'elderly',        label: 'Elderly Care' },
  { id: 'general_health', label: 'General Health Camps' },
  { id: 'awareness',      label: 'Health Awareness / Education' },
  { id: 'emergency',      label: 'Emergency Response' },
];

const PROFESSIONAL_SPECIALTIES = [
  { id: 'general_physician',      label: 'General Physician / MD' },
  { id: 'cardiologist',           label: 'Cardiologist' },
  { id: 'diabetologist',          label: 'Diabetologist / Endocrinologist' },
  { id: 'pulmonologist',          label: 'Pulmonologist' },
  { id: 'nephrologist',           label: 'Nephrologist' },
  { id: 'neurologist',            label: 'Neurologist' },
  { id: 'oncologist',             label: 'Oncologist' },
  { id: 'orthopedist',            label: 'Orthopedist' },
  { id: 'gynecologist',           label: 'Gynecologist / Obstetrician' },
  { id: 'pediatrician',           label: 'Pediatrician' },
  { id: 'psychiatrist',           label: 'Psychiatrist / Psychologist' },
  { id: 'dermatologist',          label: 'Dermatologist' },
  { id: 'ophthalmologist',        label: 'Ophthalmologist / Eye Specialist' },
  { id: 'ent_specialist',         label: 'ENT Specialist' },
  { id: 'dentist',                label: 'Dentist / Dental Surgeon' },
  { id: 'physiotherapist',        label: 'Physiotherapist' },
  { id: 'dietician_nutritionist', label: 'Dietician / Nutritionist' },
  { id: 'ayurvedic',              label: 'Ayurvedic (BAMS)' },
  { id: 'homeopathic',            label: 'Homeopathic (BHMS)' },
  { id: 'nurse',                  label: 'Nurse (GNM / BSc)' },
  { id: 'pharmacist',             label: 'Pharmacist' },
  { id: 'lab_technician',         label: 'Lab Technician / Pathologist' },
  { id: 'other',                  label: 'Other Healthcare Professional' },
];

const ORG_TYPES = [
  { id: 'ngo',               label: 'NGO (Non-Governmental Organization)' },
  { id: 'trust',             label: 'Charitable Trust' },
  { id: 'foundation',        label: 'Foundation' },
  { id: 'hospital',          label: 'Hospital / Medical Center' },
  { id: 'clinic',            label: 'Clinic / Dispensary' },
  { id: 'diagnostic_center', label: 'Diagnostic / Pathology Center' },
  { id: 'other',             label: 'Other' },
];

const SEWA_LEVELS = [
  { level: 'Sewadar',       minScore: 0 },
  { level: 'Sevak',         minScore: 500 },
  { level: 'Sewa Mitra',    minScore: 2000 },
  { level: 'Sewa Veer',     minScore: 5000 },
  { level: 'Sewa Shrestha', minScore: 10000 },
];
