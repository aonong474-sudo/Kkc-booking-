rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function signedIn() { return request.auth != null; }
    function isAdmin() {
      return signedIn() && request.auth.token.get('email', '') in ['aonong474@gmail.com'];
    }

    match /members/{u} {
      allow read: if signedIn();
      allow write: if signedIn() && (request.auth.uid == u || isAdmin());
    }

    match /banned/{u} {
      allow read: if signedIn();
      allow write: if isAdmin();
    }

    match /settings/{d} {
      allow read: if signedIn();
      allow write: if isAdmin();
    }

    // ประวัติคนไม่มาเช็คอิน: สร้างได้เฉพาะตอนลบคิวที่หมดเวลาจริง และข้อมูลต้องตรงกับคิวนั้น
    match /noshows/{id} {
      allow read: if isAdmin();
      allow create: if signedIn()
        && exists(/databases/$(database)/documents/bookings/$(id))
        && get(/databases/$(database)/documents/bookings/$(id)).data.checkedIn == false
        && request.time.toMillis() > get(/databases/$(database)/documents/bookings/$(id)).data.expiresAt
        && request.resource.data.uid == get(/databases/$(database)/documents/bookings/$(id)).data.uid
        && request.resource.data.name == get(/databases/$(database)/documents/bookings/$(id)).data.name
        && request.resource.data.sid == get(/databases/$(database)/documents/bookings/$(id)).data.sid
        && request.resource.data.board == get(/databases/$(database)/documents/bookings/$(id)).data.board
        && request.resource.data.date == get(/databases/$(database)/documents/bookings/$(id)).data.date
        && request.resource.data.hour == get(/databases/$(database)/documents/bookings/$(id)).data.hour;
      allow delete: if isAdmin();
    }

    // บันทึกการกดจอง ใช้ตรวจจับคนกดพร้อมกันในเสี้ยววินาที
    match /bids/{id} {
      allow read: if signedIn();
      allow create: if signedIn()
        && request.resource.data.uid == request.auth.uid
        && request.resource.data.t == request.time;
      allow delete: if signedIn() && (
        resource.data.uid == request.auth.uid
        || isAdmin()
        || request.time > resource.data.t + duration.value(60, 's')
      );
    }

    match /bookings/{id} {
      allow read: if signedIn();

      allow create: if signedIn()
        && request.resource.data.uid == request.auth.uid
        && request.resource.data.checkedIn == false
        && !exists(/databases/$(database)/documents/banned/$(request.auth.uid))
        && request.resource.data.expiresAt <=
           (request.resource.data.start > request.time.toMillis()
              ? request.resource.data.start : request.time.toMillis()) + 900000;

      // เช็คอิน: เจ้าของเท่านั้น แก้ได้เฉพาะ checkedIn/checkedAt และต้องยังไม่หมดเวลา
      allow update: if signedIn()
        && resource.data.uid == request.auth.uid
        && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['checkedIn', 'checkedAt'])
        && request.resource.data.checkedIn == true
        && request.time.toMillis() <= resource.data.expiresAt;

      allow delete: if signedIn() && (
        resource.data.uid == request.auth.uid
        || isAdmin()
        || (resource.data.checkedIn == false && request.time.toMillis() > resource.data.expiresAt)
      );
    }
  }
    }
      
