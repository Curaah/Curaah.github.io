// File upload to Supabase Storage. Nothing else.

const MAX_FILE_MB = 5;

function isFileSizeValid(file, maxMB = MAX_FILE_MB) {
  return file.size <= maxMB * 1024 * 1024;
}

// Generates a unique storage path. e.g. "userId/prefix-1726312800000.jpg"
function generateStoragePath(folder, file) {
  const ext = file.name.split('.').pop().toLowerCase();
  return `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
}

// Uploads a file and returns its public URL, or null on failure.
async function uploadToStorage(file, bucket, path) {
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { cacheControl: '3600', upsert: true });

  if (error) {
    console.error('[upload]', error.message);
    return null;
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

// Updates a file-upload zone UI to show the selected file name.
function markUploadZoneReady(zoneId, fileName) {
  const zone = document.getElementById(zoneId);
  if (!zone) return;
  zone.classList.add('has-file');
  zone.querySelector('.fu-title').textContent = fileName;
  zone.querySelector('.fu-sub').textContent   = 'File selected — tap to change';
}
