# Feedback DigiProf

Site pentru formularul de feedback DigiProf. Pagina se publica pe Vercel, iar raspunsurile se salveaza intr-un fisier text din repository-ul GitHub: `data/responses.txt`.

## Cum functioneaza

- Participantul completeaza formularul din `index.html`.
- Vercel primeste raspunsul prin `/api/submit`.
- Raspunsul este adaugat in `data/responses.txt` din GitHub.
- Adminul intra pe `admin.html`, se autentifica, apoi vede toate raspunsurile si poate descarca fisierul TXT.
- Fiecare login admin (reusit sau respins) este salvat in `data/admin-logins.txt` cu IP si user-agent.

## Important

Nu cere si nu salva parolele participantilor. Formularul salveaza nume, username, email si feedback. Parola este doar pentru accesul profesoarei la panoul de admin.

## 1. Pune proiectul pe GitHub

Din folderul proiectului:

```bash
git add .
git commit -m "Add DigiProf feedback form"
```

Primul commit poate cere nume si email. Daca apare mesajul `Author identity unknown`, ruleaza:

```bash
git config --global user.name "Numele tau"
git config --global user.email "emailul-tau@example.com"
git commit -m "Add DigiProf feedback form"
```

Apoi creeaza un repository nou pe GitHub si impinge proiectul acolo:

```bash
git remote add origin https://github.com/USERNAME/feedback-digiprof.git
git push -u origin main
```

## 2. Creeaza token GitHub pentru fisierul TXT

1. Intra pe GitHub.
2. Mergi la `Settings` -> `Developer settings` -> `Personal access tokens` -> `Fine-grained tokens`.
3. Creeaza un token nou.
4. La `Repository access`, alege doar repository-ul acestui site.
5. La `Permissions`, seteaza `Contents` pe `Read and write`.
6. Copiaza tokenul. GitHub il arata o singura data.

## 3. Publica pe Vercel

1. Intra pe Vercel.
2. Alege `Add New` -> `Project`.
3. Selecteaza repository-ul GitHub.
4. Lasa setarile implicite.
5. Inainte sau dupa deploy, mergi la `Settings` -> `Environment Variables`.

Adauga aceste variabile:

```txt
GITHUB_TOKEN=tokenul_copiat_din_GitHub
GITHUB_OWNER=username-ul_tau_de_GitHub
GITHUB_REPO=numele_repository-ului
GITHUB_BRANCH=main
RESPONSES_FILE_PATH=data/responses.txt
ADMIN_LOG_FILE_PATH=data/admin-logins.txt
ADMIN_USERNAME=alinasarivan
ADMIN_PASSWORD=parola_admin
```

La `ADMIN_PASSWORD`, pune parola ceruta pentru profesoara. Nu pune parola direct in fisierele din GitHub.

## 4. Redeploy

Dupa ce ai adaugat variabilele in Vercel, apasa `Redeploy`. Linkul Vercel va fi linkul public pentru formular.

## 5. Verificare rapida

1. Deschide linkul Vercel.
2. Trimite un raspuns de test.
3. Apasa `Login admin` (merge pe pagina separata de admin).
4. Intra cu credentialele setate in Vercel.
5. Verifica daca raspunsul apare in tabel si in `data/responses.txt` din GitHub.
