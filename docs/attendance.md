# Attendance module

The attendance module is isolated from the existing payroll records and salary calculations.

## Current scope

- `/attendance` is an admin-only configuration, employee-access provisioning, and verification-review dashboard.
- `/employee/attendance` provides employee sign-in using the existing employee record `_id` and an admin-provisioned password.
- `AttendanceBranch` stores the configurable branch, geofence, shift, and policy settings.
- `AttendanceEvent`, `AttendanceVerification`, and `FaceEnrollment` are isolated attendance collections.
- GPS coordinates are intentionally blank on first use. An administrator must enter both coordinates before GPS checks can be enabled.
- GPS distance must be calculated on the trusted backend with the Haversine formula.
- The face verification provider currently fails closed with `service_unavailable`. No face match, liveness result, embedding, or model weight is faked.
- Set `FACE_VERIFICATION_ENDPOINT` and `FACE_VERIFICATION_API_KEY` only for a reviewed, commercially licensed provider.
- The provider endpoint receives the bound employee ID, event type, session ID, random challenge, fresh selfie, and approved reference image. It must return `verified`, `failed`, `inconclusive`, or `manual_review`, plus face and liveness statuses.

## Required before employee check-in

1. Define the existing employee authentication contract and the stable employee ID it supplies.
2. Configure branch coordinates in `/attendance`.
3. Decide and record grace-period and half-day policies.
4. Review the code, pretrained weights, and dependencies of a face-recognition and anti-spoofing provider for commercial deployment. Implement it behind `FaceVerificationProvider` only after licensing and security review.
5. Add a privacy notice, consent flow, retention/deletion job, rate limiting, and administrator approval workflow before activating biometric enrollment.

Employee authentication extends the existing session approach with a role-specific signed cookie. It does not create duplicate employee records or accept a client-supplied employee ID for attendance requests.

## Model and image-retention policy

Raw selfies and video are not stored by the current foundation. `FaceEnrollment.representationCiphertext` is excluded from normal queries and must remain encrypted if a reviewed provider is added. Do not log raw images, embeddings, passwords, or provider credentials. Define a documented retention period and deletion process before collecting biometric data.

## Rollback

The module can be disabled by removing the Attendance navigation link and leaving its isolated collections unused. Existing payroll APIs, salary calculations, employee records, and the original manual attendance API are not modified by this foundation.
