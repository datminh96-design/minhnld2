const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wtjuyjhviqqaejmmelje.supabase.co';
const supabaseKey = 'sb_publishable_MjR3drlK4_8Em2qYcBgegw_wO69SxpH';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  // Let's get the user ID for datminh96@gmail.com by querying profiles (if possible without auth, assuming RLS allows it? Actually RLS might block it)
  // But wait, RLS blocks querying profiles. Let's try to query investment_assets with the admin key? I don't have the admin key.
  console.log("Cannot query user data without logging in or using service key.");
}
checkData();
