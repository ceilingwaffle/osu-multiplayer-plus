// from jquery-color
export const colors = {
  aqua: "#00ffff",
  azure: "#f0ffff",
  beige: "#f5f5dc",
  black: "#000000",
  blue: "#0000ff",
  brown: "#a52a2a",
  cyan: "#00ffff",
  darkblue: "#00008b",
  darkcyan: "#008b8b",
  darkgrey: "#a9a9a9",
  darkgreen: "#006400",
  darkkhaki: "#bdb76b",
  darkmagenta: "#8b008b",
  darkolivegreen: "#556b2f",
  darkorange: "#ff8c00",
  darkorchid: "#9932cc",
  darkred: "#8b0000",
  darksalmon: "#e9967a",
  darkviolet: "#9400d3",
  fuchsia: "#ff00ff",
  gold: "#ffd700",
  green: "#008000",
  indigo: "#4b0082",
  khaki: "#f0e68c",
  lightblue: "#add8e6",
  lightcyan: "#e0ffff",
  lightgreen: "#90ee90",
  lightgrey: "#d3d3d3",
  lightpink: "#ffb6c1",
  lightyellow: "#ffffe0",
  lime: "#00ff00",
  magenta: "#ff00ff",
  maroon: "#800000",
  navy: "#000080",
  olive: "#808000",
  orange: "#ffa500",
  pink: "#ffc0cb",
  purple: "#800080",
  violet: "#800080",
  red: "#ff0000",
  silver: "#c0c0c0",
  white: "#ffffff",
  yellow: "#ffff00"
};

interface Color {
  name: string;
  value: string;
}

export class ColorPicker {
  private static colors: Color[] = [
    { name: "red", value: colors.red },
    { name: "blue", value: colors.blue },
    { name: "green", value: colors.green },
    { name: "yellow", value: colors.yellow },
    { name: "brown", value: colors.brown },
    { name: "orange", value: colors.orange },
    { name: "pink", value: colors.pink },
    { name: "purple", value: colors.purple },
    { name: "black", value: colors.black },
    { name: "white", value: colors.white },
    { name: "navy", value: colors.navy },
    { name: "maroon", value: colors.maroon },
    { name: "dark green", value: colors.darkgreen },
    { name: "olive", value: colors.olive },
    { name: "dark grey", value: colors.darkgrey },
    { name: "gold", value: colors.gold },

    { name: "aqua", value: colors.aqua },
    { name: "azure", value: colors.azure },
    { name: "beige", value: colors.beige },
    { name: "cyan", value: colors.cyan },
    { name: "dark blue", value: colors.darkblue },
    { name: "dark cyan", value: colors.darkcyan },
    { name: "dark khaki", value: colors.darkkhaki },
    { name: "dark magenta", value: colors.darkmagenta },
    { name: "dark olivegreen", value: colors.darkolivegreen },
    { name: "dark orange", value: colors.darkorange },
    { name: "dark orchid", value: colors.darkorchid },
    { name: "dark red", value: colors.darkred },
    { name: "dark salmon", value: colors.darksalmon },
    { name: "dark violet", value: colors.darkviolet },
    { name: "fuchsia", value: colors.fuchsia },
    { name: "indigo", value: colors.indigo },
    { name: "khaki", value: colors.khaki },
    { name: "light blue", value: colors.lightblue },
    { name: "light cyan", value: colors.lightcyan },
    { name: "light green", value: colors.lightgreen },
    { name: "light grey", value: colors.lightgrey },
    { name: "light pink", value: colors.lightpink },
    { name: "light yellow", value: colors.lightyellow },
    { name: "lime", value: colors.lime },
    { name: "magenta", value: colors.magenta },
    { name: "violet", value: colors.violet },
    { name: "silver", value: colors.silver }
  ];

  /**
   * Returns the color in the colors list listed after the given "after" color,
   * or a new randomly generated color if the "after" color is the last color, or if the "after" color does not exist in the list of colors.
   *
   * @static
   * @param {string} after Color name (e.g. "red")
   * @returns {Color} The color in the colors list, listed after the given "after" color, or a new randomly generate color.
   */
  static getNext(after?: string): Color {
    // TODO: unit test
    if (!after) return ColorPicker.colors[0];
    // Find "after" color in list
    const colorIndex = ColorPicker.colors.findIndex(c => c.name === after);
    const nextIndex = colorIndex + 1;
    // If color not found in list, or if the color is the last color in the list
    if (colorIndex === -1 || nextIndex > ColorPicker.colors.length - 1) {
      // If all colors have been used, generate a random one. Potential for collisions, but only when huge numbers of teams in a game.
      const hex = ColorPicker.generateUnlistedHex(ColorPicker.colors[colorIndex].value.substring(1));
      return { name: hex, value: `#${hex}` };
    }

    return ColorPicker.colors[nextIndex];
  }

  /**
   * Returns a random 6-character hexadecimal string like "00AAFF" (without the "#" prefix) that is unique from the list of ColorPicker colors.
   *
   * @static
   * @returns {string}
   */
  private static generateUnlistedHex(alsoNotThisHex?: string): string {
    const random = (Math.random().toString(16) + "000000").slice(2, 8);
    // get another color if this one is already in the list of colors
    if (ColorPicker.colors.find(c => c.value === `#${random}`) || random === alsoNotThisHex) {
      return ColorPicker.generateUnlistedHex(alsoNotThisHex);
    }
    return random;
  }
}
