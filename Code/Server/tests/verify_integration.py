import requests

BASE_URL = 'http://127.0.0.1:8000/api/v1'

def main():
    print("--- 1. TEST LOGIN (UC-01) ---")
    res_login = requests.post(f"{BASE_URL}/auth/login", json={"email": "user@workshop.edu.vn", "password": "User@123"})
    print("Login status:", res_login.status_code)
    assert res_login.status_code == 200, res_login.text
    token = res_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("Token acquired:", token[:25] + "...")

    print("\n--- 2. TEST GET PROFILE (UC-01) ---")
    res_me = requests.get(f"{BASE_URL}/auth/me", headers=headers)
    print("Profile:", res_me.json()["full_name"], "| Role:", res_me.json()["role"])
    assert res_me.status_code == 200

    print("\n--- 3. TEST GET WORKSHOPS (UC-08) ---")
    res_ws = requests.get(f"{BASE_URL}/workshops", headers=headers)
    print("Workshops count:", len(res_ws.json()))
    assert res_ws.status_code == 200

    print("\n--- 4. TEST MY REGISTRATIONS (UC-11) ---")
    res_my_reg = requests.get(f"{BASE_URL}/registrations/my", headers=headers)
    print("My registrations count:", len(res_my_reg.json()))
    assert res_my_reg.status_code == 200
    for r in res_my_reg.json():
        print(f"  - Reg ID: {r['registration_id']}, Workshop: {r['workshop_title']}, Status: {r['status']}, QR: {r.get('qr_payload')}")

    print("\n--- 5. TEST HTTP 401 (UNAUTHORIZED) ---")
    res_401 = requests.get(f"{BASE_URL}/auth/me", headers={"Authorization": "Bearer invalid_token_xyz"})
    print("Status:", res_401.status_code, "| Detail:", res_401.json()["detail"])
    assert res_401.status_code == 401

    print("\n--- 6. TEST HTTP 404 (NOT FOUND) ---")
    res_404 = requests.get(f"{BASE_URL}/workshops/999999", headers=headers)
    print("Status:", res_404.status_code, "| Detail:", res_404.json()["detail"])
    assert res_404.status_code == 404

    print("\n--- 7. TEST HTTP 403 (FORBIDDEN) ---")
    # Participant trying to create internal user (Admin only)
    res_403 = requests.post(f"{BASE_URL}/users", headers=headers, json={"email": "hacker@test.com", "password": "123", "full_name": "Hacker", "role": "admin"})
    print("Status:", res_403.status_code, "| Detail:", res_403.json()["detail"])
    assert res_403.status_code == 403

    print("\n--- 8. TEST BR-01 ANTI-DUPLICATE REGISTRATION (400) ---")
    # user@workshop.edu.vn is already confirmed in workshop 1
    res_dup = requests.post(f"{BASE_URL}/registrations", headers=headers, json={"workshop_id": 1, "accept_waitlist": True})
    print("Status:", res_dup.status_code, "| Detail:", res_dup.json()["detail"])
    assert res_dup.status_code == 400

    print("\n--- 9. TEST ATTENDANCE HISTORY (UC-13) ---")
    res_att = requests.get(f"{BASE_URL}/attendance/my", headers=headers)
    print("Attendance count:", len(res_att.json()))
    assert res_att.status_code == 200

    print("\n🎉 TẤT CẢ CÁC LUỒNG API VÀ HTTP STATUS CODES (401, 403, 404, 400 BR) ĐÃ HOẠT ĐỘNG CHUẨN XÁC 100%!")

if __name__ == "__main__":
    main()
