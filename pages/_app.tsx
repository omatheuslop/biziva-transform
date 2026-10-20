import React, { useEffect } from "react";
import { Button, IconButton, Pane, Tooltip } from "evergreen-ui";
import Navigator from "@components/Navigator";
import "@styles/main.css";

import NProgress from "nprogress";
import Router, { useRouter } from "next/router";
import { activeRouteData } from "@utils/routes";
import Head from "next/head";
import { Meta } from "@components/Meta";
import { useDarkMode } from "@hooks/useDarkMode";

const logo = (<strong style={{color:"#fff",fontSize:16}}>BIZIVA TRANSFORM</strong>);

export default function App(props) {
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const router = useRouter();

  useEffect(() => {
    let timer;

    const stopProgress = () => {
      clearTimeout(timer);
      NProgress.done();
    };

    const startProgress = () => NProgress.start();

    const showProgressBar = () => {
      timer = setTimeout(startProgress, 300);
      router.events.on("routeChangeComplete", stopProgress);
      router.events.on("routeChangeError", stopProgress);
    };

    router.events.on("routeChangeStart", showProgressBar);

    return () => {
      router.events.off("routeChangeComplete", stopProgress);
      router.events.off("routeChangeError", stopProgress);
      router.events.off("routeChangeStart", showProgressBar);
      timer && clearTimeout(timer);
    };
  }, []);

  const { Component, pageProps } = props;

  const activeRoute = activeRouteData(router.pathname);

  return (
    <>
      {router.pathname === "/" || !router.pathname ? (
        <Meta
          title={"Biziva Transform"}
          url={`https://transform.tools${router.pathname}`}
          description={
            "A polyglot web converter that's going to save you a lot of time."
          }
        />
      ) : (
        <Meta
          title={activeRoute?.searchTerm}
          url={`https://transform.tools${router.pathname}`}
          description={activeRoute?.desc}
        />
      )}
      <Pane
        display="flex"
        alignItems="center"
        flexDirection="row"
        is="header"
        height={40}
        backgroundColor="#b91235"
        paddingRight={20}
      >
        <Pane flex={1} display="flex" paddingX={20} className="logo-transform">
          {logo}
        </Pane>
        <Pane display="flex" alignItems={"center"}>
          <a href="/biziva/index.html" style={{color:"#fff",fontSize:13,marginRight:16}}>CSV/JSON seguro →</a>
          <Tooltip content="Toggle dark mode">
            <IconButton
              height={20}
              marginRight={10}
              icon="moon"
              onClick={toggleDarkMode}
            />
          </Tooltip>
        </Pane>
        <Pane display="flex" alignItems={"center"}>
          <a
            style={{
              display: "inline-block",
              height: 20
            }}
            href="https://github.com/ritz078/transform"
          >
            <img
              src="https://img.shields.io/github/stars/ritz078/transform?style=social"
              alt=""
            />
          </a>

          <a href="https://github.com/ritz078/transform" target="_blank">
            <Button
              appearance="minimal"
              height={40}
              css={{
                color: "#fff !important"
              }}
            >
              GitHub
            </Button>
          </a>
        </Pane>
      </Pane>

      <Pane
        backgroundColor="#FFFFFF"
        className={isDarkMode ? "dark" : "light"}
        display="flex"
        flexDirection="row"
      >
        <Navigator />
        <Component {...pageProps} />
      </Pane>
    </>
  );
}
