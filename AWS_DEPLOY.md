# OnlyDesk Backend Deployment Guide (AWS EC2 Free Tier)

This guide provides step-by-step instructions on how to host and run your OnlyDesk Signaling and Relay servers on an AWS EC2 Free Tier instance.

---

## 1. AWS EC2 Instance yaratish (Launch Instance)

1. AWS Console-ga kiring va **EC2 Dashboard**-ga o'ting.
2. **Launch Instance** (Instansiyani ishga tushirish) tugmasini bosing.
3. Sozlamalarni quyidagicha belgilang:
   * **Name**: `OnlyDesk-Server` (yoki o'zingiz xohlagan nom).
   * **Application and OS Images (AMI)**: **Ubuntu** (Ubuntu Server 24.04 LTS yoki 22.04 LTS - *Free Tier eligible*).
   * **Instance Type**: `t2.micro` (yoki ba'zi hududlarda `t3.micro`) - *Free Tier eligible*.
   * **Key Pair**: Yangi key pair yarating va `.pem` faylini kompyuteringizga yuklab oling (masalan, `onlydesk-key.pem`).
4. **Network Settings** bo'limida:
   * **Allow SSH traffic from**: `Anywhere (0.0.0.0/0)` (xavfsizlik uchun faqat o'zingizning IP manzilingizni tanlashingiz ham mumkin).
5. Pastdagi **Launch Instance** tugmasini bosing.

---

## 2. Xavfsizlik guruhini sozlash (Security Group Rules)

OnlyDesk TCP va UDP portlaridan foydalanadi, shuning uchun ularni AWS firewall (Security Group) orqali ochishimiz kerak.

1. Ishga tushgan instansiyangizni tanlang va pastdagi **Security** menyusiga o'ting.
2. **Security Groups** havolasini bosing (masalan, `launch-wizard-1` kabi nomlangan bo'ladi).
3. **Inbound rules** (Kiruvchi qoidalar) bo'limida **Edit inbound rules** tugmasini bosing.
4. Quyidagi qoidalarni qo'shing (**Add Rule**):

| Protocol Type | Port Range | Source | Description |
| :--- | :--- | :--- | :--- |
| **SSH (TCP)** | `22` | `0.0.0.0/0` | SSH orqali ulanish uchun |
| **Custom TCP** | `50000` | `0.0.0.0/0` | OnlyDesk TCP Signaling Server |
| **Custom UDP** | `50000` | `0.0.0.0/0` | OnlyDesk UDP Signaling Server |
| **Custom TCP** | `50002` | `0.0.0.0/0` | OnlyDesk TCP Relay Server |

5. **Save Rules** tugmasini bosing.

---

## 3. Serverga SSH orqali ulanish

Terminal (CMD, PowerShell yoki Git Bash) orqali yuklab olingan `.pem` fayli joylashgan papkaga o'ting va quyidagi buyruqni ishga tushiring:

```bash
# Agar Linux/Mac ishlatsangiz, kalitga ruxsat bering:
chmod 400 onlydesk-key.pem

# SSH orqali ulanish (IP manzilni AWS dashboard-dagi Public IP bilan almashtiring):
ssh -i onlydesk-key.pem ubuntu@YOUR_EC2_PUBLIC_IP
```

## 4. Serverda loyihani ishga tushirish (Avtomatik usul)

Serverga ulangandan so'ng, quyidagi qadamlarni bajaring:

### A. Loyihani yuklab olish (Git orqali)
```bash
git clone https://github.com/YOUR_GITHUB_USERNAME/onlydesk.git
cd onlydesk
```

### B. Avtomatik o'rnatish skriptini ishga tushirish
Biz barcha sozlashlarni avtomatlashtiruvchi `setup.sh` skriptini tayyorlaganmiz. U Python o'rnatishni, tizim paketlarini yangilashni va Signaling hamda Relay serverlarini `systemd` orqali fonda ishga tushirishni bajaradi:

```bash
sudo bash setup.sh
```

### C. Loglarni kuzatish va holatni tekshirish
O'rnatish muvaffaqiyatli yakunlanganidan so'ng, xizmatlar holatini tekshirish yoki loglarni real vaqtda ko'rish uchun quyidagi buyruqlardan foydalanishingiz mumkin:

```bash
# Xizmatlar holatini tekshirish
sudo systemctl status onlydesk-signaling
sudo systemctl status onlydesk-relay

# Loglarni kuzatish (monitoring)
journalctl -u onlydesk-signaling -f
journalctl -u onlydesk-relay -f
```

---

## 7. Client Sozlamasini o'zgartirish

Serveringiz AWS-da ishga tushganidan keyin, shaxsiy kompyuteringizdagi client sozlamalarini server IP manziliga yo'naltirishingiz kerak. 

Mijoz (client) kodingizda server IP manzili ko'rsatilgan qatorlarni topib (masalan, `localhost` yoki eski IP manzillar), uni o'zingizning **AWS Public IP** manzilingizga o'zgartiring:
* Signaling Server: `YOUR_EC2_PUBLIC_IP:50000`
* Relay Server: `YOUR_EC2_PUBLIC_IP:50002`
