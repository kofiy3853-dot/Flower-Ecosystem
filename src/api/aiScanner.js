export async function scanFlower(file) {
  const form = new FormData();
  form.append('image', file);
  const resp = await fetch('/api/openrouter/analyze-flower', {
    method: 'POST',
    body: form,
  });
  if (!resp.ok) throw new Error('Server error');
  return resp.json();
}
