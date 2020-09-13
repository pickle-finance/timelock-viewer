import Head from "next/head";
import { AppProps } from "next/app";
import { useState, useEffect } from "react";
import { CssBaseline, ZeitProvider, useTheme } from "@zeit-ui/react";

function App({ Component, pageProps }: AppProps) {
  const theme = useTheme();
  const [customTheme, setCustomTheme] = useState(theme);
  const themeChangeHandler = (theme) => {
    setCustomTheme(theme);
  };

  useEffect(() => {
    const theme = window.localStorage.getItem("theme");
    if (theme !== "dark") return;
    themeChangeHandler({ type: "dark" });
  }, []);

  // Cleans DOM
  useEffect(() => {
    document.documentElement.removeAttribute("style");
    document.body.removeAttribute("style");
  }, []);

  return (
    <ZeitProvider theme={customTheme}>
      <CssBaseline>
        <Head>
          <title>Pickle | txs.wtf</title>
          <meta
            name="description"
            content="Monitor transactions occuring on the PICKLE Finance timelock address."
          />
          <link rel="shortcut icon" href="/favicon.ico" />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0"
          />
        </Head>

        <Component {...pageProps} />
      </CssBaseline>
    </ZeitProvider>
  );
}

export default App;
