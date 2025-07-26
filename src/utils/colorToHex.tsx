function colorToHex(color) {

    const htmlColors = {
        black: '#000000',
        silver: '#c0c0c0',
        gray: '#808080',
        white: '#ffffff',
        maroon: '#800000',
        red: '#ff0000',
        purple: '#800080',
        fuchsia: '#ff00ff',
        green: '#008000',
        lime: '#00ff00',
        olive: '#808000',
        yellow: '#ffff00',
        navy: '#000080',
        blue: '#0000ff',
        teal: '#008080',
        aqua: '#00ffff',
        // Add more color names and their hex values as needed
      };

      return htmlColors?.[color] || color
  }

  export default colorToHex;