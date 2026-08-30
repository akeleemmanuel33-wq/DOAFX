// js/payment-flow.js

const WHATSAPP_NUMBER = '2347052421828'; // no +, no leading 0 — wa.me format

function getPlanIdFromQuery() {
  const params = new URLSearchParams(window.location.search);
  return params.get('plan');
}

async function fetchPlan(planId) {
  const { data, error } = await supabaseClient
    .from('plans')
    .select('*')
    .eq('id', planId)
    .single();

  if (error) return null;
  return data;
}

function buildWhatsAppLink(planLabel, displayName) {
  const message = `Hi, this is ${displayName || 'a DOAFX user'}. This is my receipt for the ${planLabel} subscription. Please check and review.`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

async function uploadReceipt(userId, file) {
  const ext = file.name.split('.').pop();
  const path = `${userId}/${Date.now()}.${ext}`;

  const { data, error } = await supabaseClient.storage
    .from('receipts')
    .upload(path, file, { upsert: false });

  if (error) throw error;

  const { data: urlData } = supabaseClient.storage
    .from('receipts')
    .getPublicUrl(path);

  // Note: 'receipts' bucket is private (per RLS setup) — this returns a
  // constructed URL, but actual access still requires an authenticated
  // request under RLS. For admin review, use a signed URL instead if the
  // bucket is fully private:
  //   supabaseClient.storage.from('receipts').createSignedUrl(path, 3600)
  return path; // store the storage path, not a public URL
}

async function submitPaymentConfirmation({ userId, planId, receiptPath }) {
  const { error } = await supabaseClient
    .from('payment_submissions')
    .insert({
      user_id: userId,
      plan_id: planId,
      receipt_url: receiptPath,
      status: 'pending_review',
    });

  if (error) throw error;
}