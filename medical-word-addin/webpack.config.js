const devCerts = require("office-addin-dev-certs");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const path = require("path");

module.exports = async (env, options) => {
  const dev = options.mode === "development";
  
  return {
    devtool: "source-map",
    externals: {
      'office-js': 'Office'
    },
    entry: {
      polyfill: ["core-js/stable", "regenerator-runtime/runtime"],
      taskpane: "./src/taskpane/index.tsx",
    },
    output: {
      path: path.resolve(__dirname, "dist"),
      filename: "[name].js",
      publicPath: ""
    },
    resolve: {
      extensions: [".ts", ".tsx", ".html", ".js"],
      modules: ["node_modules", path.resolve(__dirname, "src")]
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: [
            {
              loader: "ts-loader",
              options: {
                transpileOnly: true
              }
            }
          ],
          exclude: /node_modules/
        },
        {
          test: /\.html$/,
          use: "html-loader"
        }
      ]
    },
    plugins: [
      new HtmlWebpackPlugin({
        filename: "taskpane.html",
        template: "./src/taskpane/taskpane.html",
        chunks: ["polyfill", "taskpane"]
      })
    ],
    devServer: {
      headers: {
        "Access-Control-Allow-Origin": "*"
      },
      server: {
        type: 'https',
        options: dev ? await devCerts.getHttpsServerOptions() : {}
      },
      proxy: {
        '/api': {
          target: 'http://localhost:8000',
          secure: false,
          changeOrigin: true
        }
      },
      port: 3000,
      hot: true,
      historyApiFallback: true,
      static: {
        directory: path.join(__dirname, 'public'),
        publicPath: ''
      }
    }
  };
}; 