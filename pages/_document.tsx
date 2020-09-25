import Document, { Html, Head, Main, NextScript } from "next/document";

class MyDocument extends Document {
  render() {
    return (
      <Html>
        <body>
          <style jsx global>
            {`
              html,
              body {
                height: 100vh;
                width: 100vw;
                margin: 0;
                padding: 0;
              }
            `}
          </style>
          <script
            dangerouslySetInnerHTML={{
              __html: `
            (function(){
              if (!window.localStorage) return;
              if (window.localStorage.getItem('theme') === 'dark') {
                document.documentElement.style.background = '#000';
                document.body.style.background = '#000';
              };
            })()
          `,
            }}
          />

          <script
            async
            src="https://www.googletagmanager.com/gtag/js?id=UA-71060764-22"
          ></script>
          <script
            dangerouslySetInnerHTML={{
              __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'UA-71060764-23');
          `,
            }}
          />

          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
