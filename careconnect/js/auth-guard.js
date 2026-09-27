// careconnect/js/auth-guard.js
// Runs at the TOP of every protected CareConnect page (before page JS).
// ONE responsibility: ensure the visitor has a valid, verified session.
// Pages that should be accessible before verification (verify-email, pending)
// must set  window.ALLOW_UNVERIFIED = true  BEFORE this script runs.

(async () => {
  // 1. Check for a live Supabase session
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    window.location.replace('/careconnect/login.html');
    return;
  }

  // Expose user id to page scripts
  window.currentUserId = session.user.id;

  // 2. If the page explicitly allows unverified users (verify-email, pending) stop here
  if (window.ALLOW_UNVERIFIED) return;

  // 3. Fetch verification status and role from cc_users
  const { data: u, error } = await supabase
    .from('cc_users')
    .select('is_verified, role')
    .eq('id', session.user.id)
    .single();

  if (error || !u) {
    // No cc_users row yet — account created in Supabase Auth but DB insert failed.
    // Send them back to login so they can retry.
    window.location.replace('/careconnect/login.html');
    return;
  }

  if (!u.is_verified) {
    window.location.replace('/careconnect/pending.html');
    return;
  }

  // 4. Expose role to page scripts (used by dashboards, feed, etc.)
  window.currentRole = u.role;
})();
