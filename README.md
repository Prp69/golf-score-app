# Golf Score — app native (iOS + Android)

Application de scoring golf (handicap WHS, Stableford, Stroke Play, Chouette net/brut,
Match Play, boucles Amelkis, sauvegarde/restauration).

Basée sur **Capacitor** : une seule base de code React, enveloppée en app native
iOS **et** Android. Le stockage `localStorage` fonctionne nativement — les données
sont donc réellement persistées sur l'appareil (fini le souci de l'artefact).

---

## 0. Prérequis (une fois)

- **Node.js 20+** (https://nodejs.org)
- Depuis le dossier du projet :
  ```bash
  npm install
  ```

---

## 1. Tester sur ordinateur (facultatif)

```bash
npm run dev
```
Ouvre l'app dans le navigateur (http://localhost:5173).

---

## 2. Android → fichier .apk (Windows / Linux / Mac)

Faisable **entièrement sans Mac**.

### Prérequis Android
- **Android Studio** (https://developer.android.com/studio) OU le **JDK 17** + Android SDK
  en ligne de commande.

### Étapes
```bash
npm run build           # compile le web dans dist/
npx cap add android     # crée le projet natif android/ (une seule fois)
npx cap sync android    # copie le web dans le projet natif
npx cap open android    # ouvre Android Studio
```
Dans Android Studio : menu **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
Le fichier `app-debug.apk` apparaît dans
`android/app/build/outputs/apk/debug/`. Copiez-le sur le téléphone et installez-le
(autorisez « sources inconnues »).

### En ligne de commande, sans ouvrir Android Studio
```bash
npm run build && npx cap sync android
cd android
./gradlew assembleDebug        # Windows : gradlew.bat assembleDebug
```
APK produit : `android/app/build/outputs/apk/debug/app-debug.apk`.

> Pour un APK de release (optimisé), utilisez `assembleRelease` et signez-le avec
> un keystore — non nécessaire pour un usage personnel.

---

## 3. iOS → fichier .ipa pour AltStore / AltStore PAL (SANS Mac)

Apple impose macOS + Xcode pour compiler un `.ipa`. Comme vous êtes sous
Windows/Linux, on utilise un **runner macOS gratuit de GitHub Actions** qui compile
à votre place. Le workflow est déjà fourni : `.github/workflows/ios-build.yml`.

### Étapes
1. Créez un dépôt sur **GitHub** et poussez-y ce dossier :
   ```bash
   git init
   git add .
   git commit -m "Golf Score app"
   git branch -M main
   git remote add origin https://github.com/VOTRE_COMPTE/golf-score-app.git
   git push -u origin main
   ```
2. Sur GitHub, onglet **Actions** → workflow **« Build iOS IPA »** → **Run workflow**.
   (ou poussez un tag : `git tag v1.0.0 && git push --tags`)
3. À la fin (~5 min), téléchargez l'artefact **GolfScore-unsigned-ipa**
   (un `.ipa` non signé).

### Installer le .ipa sur l'iPhone
Le `.ipa` est **non signé** : AltStore le signe avec votre identifiant Apple au
moment de l'installation.
- **AltStore PAL** (UE) ou **AltStore classique** / **SideStore** : ouvrez l'app,
  « + » → sélectionnez le `.ipa` téléchargé → il s'installe et se signe.
- Rappel AltStore : l'app doit être **re-signée tous les 7 jours** (compte Apple
  gratuit) — AltStore le fait automatiquement en tâche de fond s'il tourne.

> Alternative sans rien compiler : ouvrir le site/PWA dans Safari puis
> « Partager → Sur l'écran d'accueil ». Mais l'app native `.ipa` est plus intégrée.

---

## 4. Mettre à jour l'app après une modification

```bash
npm run build
npx cap sync
```
puis rebuild Android (étape 2) et/ou relancer le workflow iOS (étape 3).

---

## Structure

```
src/App.jsx            → toute l'application (logique + UI)
src/main.jsx           → point d'entrée React
index.html             → page hôte
capacitor.config.json  → config app (nom, id, couleurs)
vite.config.js         → build web (base relative pour WebView native)
.github/workflows/     → build iOS automatique (cloud macOS)
android/  ios/         → projets natifs générés par `cap add` (non versionnés par défaut)
```

## Données & sauvegarde
Les données restent sur l'appareil (`localStorage` de la WebView). L'écran
« Sauvegarde / Restauration » et le backup copiable dans le presse-papier
restent disponibles comme filet de sécurité et pour transférer entre appareils.
