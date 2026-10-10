# Projekt website

En React/Vite-hjemmeside med en valgfri Express-backend til Discord-login, ansøgninger og adminværktøjer.

## Kom i gang

Forudsætter Node.js 20.19+ eller 22.12+.

```sh
npm install
npm install --prefix server
npm run dev
```

Åbn <http://localhost:5173>. Siden kan startes uden Discord-konfiguration; Discord-login kræver trinnene nedenfor.

## Discord-login (valgfrit)

1. Kopiér `server/.env.example` til `server/.env`.
2. Udfyld Discord-appens client ID, client secret, bot-token, server-ID og adminrolle-ID.
3. Registrér `http://localhost:4000/api/auth/discord/callback` som OAuth redirect-URL i Discord.
4. Genstart udviklingsserveren.

På Windows kan du kopiere skabelonen med:

```powershell
Copy-Item server/.env.example server/.env
```

Læg aldrig `.env` eller rigtige tokens, server-ID'er eller invitationer på GitHub. `.env` ignoreres allerede af Git.

## Tilpasning

- Tekster og serverindstillinger: `src/siteConfig.js`
- Logo: behold én billedfil i `src/assets/branding/`; filnavnet kan være valgfrit.
- Galleri: `public/images/gallery/`
- Opret ansøgninger efter Discord-login på `/admin`.

Udfyld `connectUrl`, `discordUrl` og `cfxCode` i `src/siteConfig.js`, hvis du vil vise serverens links og live-status. Tomme links skjules.

## Produktionsbuild

```sh
npm run build
npm run preview
```
