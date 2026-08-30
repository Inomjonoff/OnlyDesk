import { DEMO_QUOTAS } from "../packages/config/src/constants";

export interface DemoUserRecord {
  userId: string;
  email: string;
  name: string;
  deviceId: string;
  deviceFingerprint: string;
}

export function generateDemoDataset(count = DEMO_QUOTAS.MAX_REGISTERED_USERS): DemoUserRecord[] {
  const users: DemoUserRecord[] = [];

  for (let i = 1; i <= count; i++) {
    const padded = String(i).padStart(3, "0");
    users.push({
      userId: `usr_demo_${padded}`,
      email: `demo_user_${padded}@nexusdesk.uz`,
      name: `Demo User ${padded}`,
      deviceId: `dev_demo_${padded}`,
      deviceFingerprint: `fp_ed25519_${padded}_${Math.random().toString(36).slice(2, 10)}`,
    });
  }

  return users;
}

if (require.main === module) {
  console.log(`🌱 Provisioning ${DEMO_QUOTAS.MAX_REGISTERED_USERS} Demo Users & Devices...`);
  const data = generateDemoDataset();
  console.log(`✅ Generated ${data.length} demo records.`);
  console.log(`Sample:`, data[0]);
  console.log(`Sample:`, data[99]);
  console.log("✅ Demo provisioning completed.");
}
