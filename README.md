# 📱 CryingOS

<p align="center">
  <img src="https://img.shields.io/badge/PHP-8.2+-777BB4?style=for-the-badge&logo=php&logoColor=white" alt="PHP Version">
  <img src="https://img.shields.io/badge/MySQL-8.0+-4479A1?style=for-the-badge&logo=mysql&logoColor=white" alt="Database">
  <img src="https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript">
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License">
  <img src="https://img.shields.io/badge/UI-iOS%20Inspired-007AFF?style=for-the-badge&logo=apple&logoColor=white" alt="UI Style">
</p>

<p align="center">
  <b>A fully functional, web-based mobile operating system simulator.</b><br>
  Experience a beautiful, responsive, and secure iOS-inspired environment running entirely in your browser, powered by PHP, MySQL, and Vanilla JavaScript.
</p>

<p align="center">
  <img src="https://via.placeholder.com/800x450/1a1a2e/ffffff?text=CryingOS+Preview+(Add+Your+Screenshot+Here)" alt="CryingOS Preview" width="800">
</p>

---

## 🌟 About The Project

**CryingOS** is not just a UI mockup; it is a highly sophisticated, modular, web-based operating system. It simulates a real smartphone environment with persistent data storage, a secure server-side proxy web browser, comprehensive media management, and a robust, extensible application ecosystem. 

Designed with a modern **"Liquid Glass"** aesthetic, it features buttery-smooth animations, fully responsive layouts (optimized for both mobile and desktop), and a strict separation of concerns between the core OS engine and individual applications. Every interaction is designed to feel native, intuitive, and secure.

### ✨ Core Features
- 🌐 **Secure Proxy Browser:** Browse the web anonymously through the server. Features advanced URL rewriting, iframe isolation, form interception, and non-ASCII character support for global accessibility.
- 🖼️ **Advanced Gallery:** Full support for images and videos, dynamic grid/list views, favorites, drag-and-drop uploads, and a cinematic lightbox viewer.
- 🎵 **Media Suite:** A complete Music Player (with playlists, background playback, and cover art) and a high-fidelity Voice Recorder.
- 📝 **Notes & Drawings:** Rich text notes and a fully functional HTML5 Canvas drawing pad with undo/redo, multiple brush types, and color palettes.
- 📁 **Unified File Manager:** A centralized hub to view, manage, download, and delete all files generated across the entire OS ecosystem.
- 💬 **Communication Hub:** A fully working Contacts app and a real-time Messaging system with read receipts, conversation threading, and user blocking capabilities.
- ⏰ **Clock & Utilities:** World clock, customizable alarms, stopwatch with lap tracking, and a visual countdown timer.
- ⚙️ **Dynamic Settings:** Change wallpapers (presets or custom uploads), manage security passcodes, and view detailed device storage statistics.

---

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Backend** | PHP 7.4+ (PDO, cURL, Secure File Handling) |
| **Database** | MySQL / MariaDB |
| **Frontend** | Vanilla JavaScript (ES6+), HTML5, CSS3 |
| **Styling** | CSS Grid/Flexbox, Backdrop-filter (Liquid Glass), CSS Variables |
| **Server** | Apache (via XAMPP or WAMP) |

---

## 🚀 Installation Guide (XAMPP / WAMP)

Follow these precise steps to run CryingOS locally on your machine. *Note: For a cleaner URL structure, the contents of the `root` directory should be placed directly into your server's public folder.*

### 1. Prerequisites
- Download and install [XAMPP](https://www.apachefriends.org/index.html) or [WAMP](https://www.wampserver.com/en/) (Ensure it includes **PHP 8.2+** and **MySQL**).
- Git installed on your system (optional, but recommended).

### 2. Clone and Position the Files
Open your terminal or command prompt. Instead of nesting folders, place the project directly into `htdocs` (XAMPP) or `www` (WAMP):

**For XAMPP (Windows):**
```bash
cd C:\xampp\htdocs
git clone https://github.com/BSHF-PER/CryingOS.git temp_clone
move temp_clone\root\* .
rmdir /s /q temp_clone
```
*(If doing this manually: Open the downloaded `CryingOS` folder, open the `root` folder, and copy **all** its contents directly into `C:\xampp\htdocs`)*

**For WAMP (Windows):**
```bash
cd C:\wamp64\www
# Follow the same manual copy process as above into the 'www' directory
```

### 3. Database Setup
1. Start **Apache** and **MySQL** from your XAMPP/WAMP Control Panel.
2. Open your browser and navigate to `http://localhost/phpmyadmin`.
3. Create a new database named `crying_phone`.
4. Select the `crying_phone` database, go to the **Import** tab, and import the SQL schema file located at `database/schema.sql` (or execute the provided migration queries).

### 4. Configuration
1. Open `core/bootstrap.php` (or your main configuration file).
2. Update the database credentials to match your local server setup (usually default for XAMPP/WAMP):
   ```php
   define('DB_HOST', '127.0.0.1');
   define('DB_NAME', 'crying_phone');
   define('DB_USER', 'root');
   define('DB_PASS', ''); // Leave empty for default XAMPP/WAMP
   ```
3. Ensure the `uploads` directory and its subdirectories (`images`, `music`, `voice`, `covers`, `thumbnails`, `notes`) have write permissions. Windows servers usually handle this automatically, but verify they exist.

### 5. Run the Application
Open your browser and navigate to:
```text
http://localhost/
```
*Your CryingOS device is now fully operational!*

---

## 🧑‍💻 Developer Guide: Creating a New App

CryingOS features a highly modular app architecture. To create a new application, you only need to create a few structured files and register them in the database. The OS handles the rest.

Let's create a sample app called **"Calculator"**.

### Step 1: Create the App Directory
Navigate to the `apps` folder and create a new directory for your app:
```text
apps/calculator/
```

### Step 2: Define the Manifest (`manifest.json`)
Create `apps/calculator/manifest.json`. This file acts as the blueprint, telling the OS everything it needs to know about your app.
```json
{
  "slug": "calculator",
  "name": "Calculator",
  "icon": "🧮",
  "iconType": "emoji", 
  "iconSrc": "", 
  "color": "#FF9500",
  "version": "1.0.0",
  "description": "A simple and elegant calculator",
  "default": true,
  "removable": true,
  "entry": "apps/calculator/app.js",
  "styles": ["apps/calculator/style.css"],
  "sort": 10
}
```
*(Note: If `iconType` is set to `"image"`, provide a path to an SVG in `iconSrc` and set `icon` to a fallback emoji).*

### Step 3: Build the Frontend Logic (`app.js`)
Create `apps/calculator/app.js`. Every app must register itself with the global `CP` (Crying Phone) object.

```javascript
/* Calculator App */
(function () {
  'use strict';

  // Register the app with the OS core
  CP.register('calculator', {
    
    // Called when the app is opened and mounted to the DOM
    async mount(root, cp) {
      // 'root' is the isolated DOM container for your app
      // 'cp' is the OS API (cp.toast, cp.api, cp.openApp, etc.)
      
      root.innerHTML = `
        <div class="calc-app">
          <h1>Calculator</h1>
          <button id="calcBtn">Click Me</button>
        </div>
      `;

      // Add event listeners
      root.querySelector('#calcBtn').addEventListener('click', () => {
        cp.toast('Button clicked successfully!'); // Show an OS-level toast notification
      });
    },

    // Called when the app is closed (cleanup memory, intervals, event listeners, etc.)
    unmount(root, cp) {
      console.log('Calculator app unmounted and cleaned up');
    }
  });
})();
```

### Step 4: Style the App (`style.css`)
Create `apps/calculator/style.css`. Use CSS variables and backdrop filters to seamlessly match the OS aesthetic.
```css
.calc-app {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  color: #000;
}

.calc-app button {
  padding: 12px 24px;
  background: #FF9500;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, background 0.2s;
}

.calc-app button:hover {
  background: #FFB340;
}

.calc-app button:active {
  transform: scale(0.95);
}
```

### Step 5: (Optional) Create a Backend API
If your app needs to save or retrieve persistent data, create `api/calculator.php`.
```php
<?php
declare(strict_types=1);
require_once __DIR__ . '/../core/bootstrap.php';

header('Content-Type: application/json; charset=utf-8');

$pdo = db();
$phoneId = (int)$PHONE['id']; // ALWAYS isolate data by phone_id for security!

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $in = json_decode(file_get_contents('php://input'), true) ?: [];
    
    if (($in['action'] ?? '') === 'save_data') {
        // 1. Validate and sanitize $in['data']
        // 2. Execute prepared statement
        // $pdo->prepare('INSERT INTO calculator_data (phone_id, data) VALUES (?, ?)')->execute([$phoneId, $sanitizedData]);
        
        echo json_encode(['ok' => true, 'message' => 'Data saved successfully']);
        exit;
    }
}
http_response_code(405); // Method Not Allowed
```
*Crucial: Don't forget to add `'calculator' => 'api/calculator.php'` to the `api` routing array in `index.php`.*

### Step 6: Register the App in the Database
To make the OS recognize your new app, insert it into the `apps_catalog` table via phpMyAdmin or an SQL client:

```sql
INSERT INTO apps_catalog 
(slug, name, description, icon, icon_type, icon_src, color, version, entry, styles, removable, is_default, sort)
VALUES 
('calculator', 'Calculator', 'A simple and elegant calculator', '🧮', 'emoji', '', '#FF9500', '1.0.0', 'apps/calculator/app.js', '["apps/calculator/style.css"]', 1, 1, 10);
```
*To automatically install it on all newly created phones, ensure `is_default = 1`. Otherwise, users can discover and install it via the App Store.*

---

## 🔒 Security & Privacy Architecture

CryingOS is engineered with a security-first mindset:
1. **Proxy Isolation:** The built-in browser uses a server-side cURL proxy. The user's real IP address and location are never exposed to visited websites.
2. **Strict Data Segregation:** Every single database query strictly filters by `phone_id`, ensuring absolute isolation. Users cannot access another device's messages, files, or settings.
3. **SQL Injection Prevention:** All database interactions exclusively use PDO with prepared statements and parameterized queries.
4. **File Upload Validation:** Rigorous MIME-type checking and strict extension validation are enforced for all media uploads to prevent malicious file execution.
5. **XSS Protection:** The core OS provides a robust `esc()` sanitization function, and all dynamic content rendered by apps is strictly escaped before DOM insertion.

---

## 🤝 Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📜 License

Distributed under the **MIT License**. See the `LICENSE` file in the repository for more information.

---

## 🙏 Acknowledgements

- Inspired by the fluid, intuitive design language of modern mobile operating systems.
- Built with ❤️ by [BSHF-PER](https://github.com/BSHF-PER).
- Special thanks to the open-source community for the amazing tools, protocols, and knowledge that made this project possible.

<p align="right">(<a href="#top">back to top</a>)</p>
