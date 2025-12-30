## My IDE Setup

* [VS Code](https://code.visualstudio.com/)
* [Tauri extension](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode)
* [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

# Building Chanterelle

Windows:
`pnpm build` creates the production build in the `src-tauri/target/release/bundle` folder.

# Publishing Chanterelle (github releases)

Windows:

* Install SimplySign Desktop: https://support.certum.eu/en/cert-offer-software-and-libraries
* Log into SimplySign Desktop
* Open Terminal and a tab called "Developer Powershell for VS" (that's where signtool is installed) (or install Windows SDK ...)
* Sign the exe/msi file: `signtool sign /fd SHA256 /tr http://timestamp.digicert.com /td SHA256 /a "C:\\...\\chanterelle\\src-tauri\\target\\release\\bundle\\nsis\\Chanterelle\_0.1.0\_x64-setup.exe"`
  You can also include `/i "Certum"`, that is `signtool sign /fd SHA256 /tr http://timestamp.digicert.com /td SHA256 /i "Certum" /a "C:\\...\\chanterelle\\src-tauri\\target\\release\\bundle\\nsis\\Chanterelle\_0.1.0\_x64-setup.exe"`
* Verify: `signtool verify /pa "C:\\...\\chanterelle\\src-tauri\\target\\release\\bundle\\nsis\\Chanterelle\_0.1.0\_x64-setup.exe"`
* For the MSI file, you could hit an error from signtool. In that case, move/copy the MSI file to another location and retry (potential reason: Released file locks ...)
* Checksums (optional):
  `Get-FileHash "C:\\...\\chanterelle\\src-tauri\\target\\release\\bundle\\nsis\\Chanterelle\_0.1.0\_x64-setup.exe" -Algorithm SHA256`
  Then copy the resulted hash
* Release description example:
  First release
  Windows EXE installer (signed with Certum): Chanterelle\_0.1.0\_x64-setup.exe
  Windows MSI installer (signed with Certum): Chanterelle\_0.1.0\_x64\_en-US.msi
  Checksums (SHA256)
  Chanterelle\_0.1.0\_x64-setup.exe
  E01E31A42C4C97E7548F0FE8C1FA1B8D85DC5D1F2423BD41D4305E4E84B6CF72
  Chanterelle\_0.1.0\_x64\_en-US.msi
  C1445BAB821772DD81EE310B2EEDC255E6F77AA66715D78403953301451F426F
