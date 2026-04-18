import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Use service role to bypass RLS
    const sr = base44.asServiceRole;

    if (user.role === 'admin') {
      // Admin: find settings where owner_email or created_by matches
      const list = await sr.entities.BusinessSettings.list();
      const own = list.find(s => s.owner_email === user.email || s.created_by === user.email);
      return Response.json({ settings: own || null });
    } else {
      // Employee: find their employee record first to get owner email
      const empList = await sr.entities.Employee.filter({ email: user.email });
      if (!empList || empList.length === 0) {
        return Response.json({ settings: null });
      }
      const ownerEmail = empList[0].business_owner_email;
      const list = await sr.entities.BusinessSettings.list();
      const own = list.find(s => s.owner_email === ownerEmail || s.created_by === ownerEmail);
      return Response.json({ settings: own || null });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});