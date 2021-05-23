import "./css/login.css";

import bg0 from "./res/background/0.jpg";
import bg1 from "./res/background/1.jpg";
import bg2 from "./res/background/2.jpg";
import bg3 from "./res/background/3.jpg";
import bg4 from "./res/background/4.jpg";
const backgrounds = [bg0, bg1, bg2, bg3, bg4];

const root = document.getElementById("root");
root?.style.backgroundImage = `url(${
  backgrounds[~~(Math.random() * backgrounds.length)]
})`;
