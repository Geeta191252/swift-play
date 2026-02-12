

## Next Steps - Telegram Mini App Completion

Ab tak yeh ho chuka hai:
- Frontend UI complete (Home, Games, Earn, Friends, Wallet)
- Greedy King game with spinning wheel
- Backend code ready (Express + MongoDB + Telegram Bot API) in `backend/` folder
- Telegram payment helpers (`telegram.ts`)
- Wallet screen with deposit/withdraw currency selection

### Ab yeh kaam baaki hai (priority order mein):

---

### Step 1: Wallet Screen ko Backend se Connect karo
Abhi wallet mein balance hardcoded `$0.00` aur `Star 0` dikh raha hai. Backend se real balance fetch karenge.

- Telegram user ID se `/api/balance` call karke real balance dikhana
- `/api/transactions` se real transaction history load karna
- Deposit/Withdraw ke baad balance auto-refresh karna

---

### Step 2: Amount Input Dialog
Abhi deposit/withdraw mein amount hardcoded hai ($1 ya 100 stars). User ko custom amount enter karne ka option dena:

- Currency select karne ke baad ek popup/dialog khulega
- Usme user amount type karega
- Phir payment flow start hoga

---

### Step 3: Top Bar Balance ko Live karo
Home screen ke top bar mein bhi balance hardcoded hai (`$0.00`, `Star 0`). Isko bhi backend se sync karna hai taki har jagah real balance dikhe.

---

### Step 4: Game Balance ko Backend se Sync karo
Greedy King game mein balance abhi local state mein hai (7575 dollar, 3200 star). Isko backend se fetch karna hai aur game ke baad jeet/haar backend pe save karni hai.

---

### Step 5: Earn Screen - Ad Watch Logic
Abhi earn screen sirf static UI hai. Actual ad watching aur star earning ka logic add karna hai.

---

### Step 6: Friends Screen - Referral System
Referral link ko dynamic banana (Telegram user ID ke basis pe) aur referral rewards backend pe track karna.

---

### Technical Details

**Step 1-3 Implementation:**
- Create a `useBalance` custom hook that calls `/api/balance` using TanStack React Query
- Pass balance data via React Context so all screens (Wallet, Home top bar, Game) can access it
- Add `queryClient.invalidateQueries` after deposit/withdraw to refresh balance

**Step 2 Implementation:**
- Create an `AmountInputDialog` component using existing Radix Dialog
- Show preset amounts (e.g., 1, 5, 10, 50 for dollars; 100, 500, 1000 for stars)
- Allow custom amount input

**Step 4 Implementation:**
- Add `/api/game/result` endpoint call after each Greedy King round
- Send bet details and result to backend for balance update
- Fetch fresh balance on game page load

**New files to create:**
- `src/hooks/useBalance.ts` - Balance fetching hook
- `src/contexts/BalanceContext.tsx` - Shared balance state
- `src/components/AmountInputDialog.tsx` - Amount picker dialog

**Files to modify:**
- `src/components/WalletScreen.tsx` - Live balance + amount dialog
- `src/components/HomeScreen.tsx` - Live balance in top bar
- `src/pages/GreedyKingGame.tsx` - Backend-synced balance
- `src/lib/telegram.ts` - Add balance fetch helper

