# Backend

Backend'en håndterer Discord-login, ansøgninger og admin-API'et.

Fra projektets rodmappe installeres pakkerne med `npm install --prefix server`.

For Discord-login:

1. Kopiér `.env.example` til `.env` i denne mappe.
2. Udfyld Discord-appens ID og secret, bot-token, server-ID og adminrolle-ID.
3. Tilføj `http://localhost:4000/api/auth/discord/callback` som redirect-URL i Discord.
4. Start projektet med `npm run dev` fra rodmappen.

`.env` indeholder private værdier og må ikke uploades. Se rodmappens README for den korte projektopsætning.
