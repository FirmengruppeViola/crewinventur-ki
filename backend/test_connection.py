from app.core.supabase import supabase

try:
    # Test connection by listing tables
    result = supabase.table('categories').select('name').limit(5).execute()

    print(f"[OK] Supabase connection successful!")
    print(f"[INFO] Found {len(result.data)} categories:")
    for cat in result.data:
        print(f"  - {cat['name']}")

except Exception as e:
    print(f"[ERROR] Connection failed: {e}")
