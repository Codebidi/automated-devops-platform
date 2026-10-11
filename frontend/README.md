# DeployHub — CI/CD Deployment Console & Platform

DeployHub is an enterprise-grade CI/CD deployment platform featuring an automated 4-stage pipeline gate, instantaneous 1-click rollbacks, role-based governance, and a unified dual-engine database layer (SQLite for development & PostgreSQL 16 for production).

---

## 🗺️ Application Routes

| Path | Access Tier | Description |
| :--- | :--- | :--- |
| `/` | **Public** | High-polish landing page showcasing pipeline visual, capabilities, stats, roles & security |
| `/login` | **Public** | Split-screen authentication with CapsLock warning, password toggle, and quick-fill demo chips |
| `/app` | **Authenticated** | Executive Dashboard: live deployed container, trend sparklines, velocity charts, recent runs |
| `/app/runs` | **Authenticated** | Searchable & filterable CI/CD pipeline runs with segmented status filters |
| `/app/runs/:id`| **Authenticated** | Detailed pipeline stepper & terminal log viewer (Developer+ to inspect raw logs) |
| `/app/deployments` | **Authenticated** | Historical release timeline, live target badge & typed-confirmation rollback (**Admin only**) |
| `/app/users` | **Admin Only** | User governance: account creation, role assignments (Viewer/Developer/Admin), status toggles |
| `/app/settings` | **Admin Only** | Infrastructure targets, connected GitHub repository, and required environment secrets checklist |
| `*` | **Public** | Styled 404 resource-not-found screen |

---

## 🎨 Design System Overview

DeployHub utilizes a custom, tokenized design system built on CSS custom properties and Tailwind CSS 3, providing parity across light and dark modes:

### 1. Typography
- **Headings**: `@fontsource-variable/plus-jakarta-sans` with geometric precision and tight tracking (`-0.025em`).
- **Body**: `@fontsource-variable/inter` with tabular numerals and clean legibility.
- **Terminal & Monospace**: `JetBrains Mono` / system monospace for commit SHAs, logs, and container tags.
- **Fluid Type Scale**: Defined with responsive `clamp()` functions (`.text-display`, `.text-h1`, `.text-h2`, `.text-h3`, `.text-h4`).

### 2. Color Tokens & Layers
All colors map directly to CSS variables defined in `src/index.css`:
- **Canvas & Surfaces**:
  - Light: `--bg-canvas` (`#f8fafc`), `--bg-surface` (`#ffffff`), `--bg-subtle` (`#f1f5f9`)
  - Dark: `--bg-canvas` (`#060911`), `--bg-surface` (`#0c1222`), `--bg-surface-elevated` (`#111a33`)
- **Brand Accent**: Deep Indigo (`#4f46e5`) &rarr; Violet (`#7c3aed`) &rarr; Cyan (`#06b6d4`)
- **Semantic Statuses**:
  - Success: `#10b981` (Emerald)
  - Warning: `#f59e0b` (Amber)
  - Danger: `#ef4444` (Rose)
  - Info: `#3b82f6` (Blue)
- **Glow Shadows**: `--glow-brand`, `--glow-cyan`, `--glow-emerald`
- **Glassmorphism**: `.glass-card` uses `backdrop-filter: blur(16px)` with subtle border highlights.

### 3. Motion & Accessibility
- **CSS Transitions**: Subtly applied to button active states (`active:scale-[0.98]`), hover elevations, and theme toggling.
- **Reduced Motion**: Full override under `@media (prefers-reduced-motion: reduce)` disabling animations and transitions.
- **Color Independence**: Status is never communicated by color alone (always paired with icon indicators and accessible text).

---

## 🖌️ How to Change Brand Colors

To customize the primary brand palette across the entire application:

1. Open `src/index.css`.
2. Locate the Brand Accents section under `:root` and `.dark`:
   ```css
   :root {
     --brand-primary: #4f46e5;
     --brand-violet: #7c3aed;
     --brand-cyan: #06b6d4;
     --brand-gradient: linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-violet) 50%, var(--brand-cyan) 100%);
     --glow-brand: 0 0 25px -4px rgba(79, 70, 229, 0.35);
   }
   ```
3. Update the hex values and gradient stops. All UI components, buttons, glows, gradient texts, and charts will adapt automatically.

---

## 👥 Role Permissions Matrix

| Feature | Viewer | Developer | Administrator |
| :--- | :---: | :---: | :---: |
| View Pipeline Runs & Status | ✅ | ✅ | ✅ |
| Monitor Live Application Health | ✅ | ✅ | ✅ |
| Inspect Historical Releases | ✅ | ✅ | ✅ |
| View Raw Terminal Stage Logs | 🔒 Restricted | ✅ | ✅ |
| Trigger Emergency Rollbacks | ❌ | ❌ | ✅ |
| Add / Manage Platform Users | ❌ | ❌ | ✅ |
| Modify System Settings & Secrets | ❌ | ❌ | ✅ |

---

## ⚡ Quick-Start Development

```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm run dev
# Dashboard opens on http://localhost:5173

# 3. Production build validation
npm run build
```

**Seeded Test Credentials:**
- **Admin**: `admin` / `Admin@12345`
- **Developer**: `developer` / `Dev@123456`
- **Viewer**: `viewer` / `View@12345`
