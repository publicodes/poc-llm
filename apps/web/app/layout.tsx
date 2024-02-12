"use client";
import { DsfrHead } from "@codegouvfr/react-dsfr/next-appdir/DsfrHead";
import { DsfrProvider } from "@codegouvfr/react-dsfr/next-appdir/DsfrProvider";
import { getHtmlAttributes } from "@codegouvfr/react-dsfr/next-appdir/getHtmlAttributes";
import { StartDsfr } from "./StartDsfr";
import { defaultColorScheme } from "./defaultColorScheme";
import { Header } from "@codegouvfr/react-dsfr/Header";
import { Footer } from "@codegouvfr/react-dsfr/Footer";
import { headerFooterDisplayItem } from "@codegouvfr/react-dsfr/Display";
import { fr } from "@codegouvfr/react-dsfr";
import Link from "next/link";

export default function RootLayout({ children }: { children: JSX.Element }) {
  return (
    <html {...getHtmlAttributes({ defaultColorScheme })}>
      <head>
        <title>Publi.codes + LLM démo</title>
        <StartDsfr />
        <DsfrHead
          Link={Link}
          preloadFonts={[
            //"Marianne-Light",
            //"Marianne-Light_Italic",
            "Marianne-Regular",
            //"Marianne-Regular_Italic",
            "Marianne-Medium",
            //"Marianne-Medium_Italic",
            "Marianne-Bold",
            //"Marianne-Bold_Italic",
            //"Spectral-Regular",
            //"Spectral-ExtraBold"
          ]}
        />
      </head>
      <body
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <DsfrProvider>
          <Header
            brandTop={
              <>
                INTITULE
                <br />
                OFFICIEL
              </>
            }
            serviceTitle="Démo publi.codes + LLM"
            homeLinkProps={{
              href: `/${(document && document.location.hash) || ""}`,
              title:
                "Accueil - Nom de l’entité (ministère, secrétariat d‘état, gouvernement)",
            }}
            quickAccessItems={[
              headerFooterDisplayItem,
              // {
              //   iconId: "ri-mail-line",
              //   linkProps: {
              //     href: "mailto:contact@code.gouv.fr",
              //   },
              //   text: "Contact us",
              // },
            ]}
          />
          <div
            style={{
              flex: 1,
              flexDirection: "column",
              display: "flex",
              margin: "auto",
              maxWidth: 1000,
              width: "100%",
              ...fr.spacing("padding", {
                topBottom: "10v",
              }),
            }}
          >
            {children}
          </div>
          <Footer
            accessibility="fully compliant"
            contentDescription={`
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor 
                    incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, 
                    quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. 
                    Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore 
                    eu fugiat nulla pariatur. 
                `}
            bottomItems={[headerFooterDisplayItem]}
          />
        </DsfrProvider>
      </body>
    </html>
  );
}
