const path = require('path')
const VueLoaderPlugin = require('vue-loader/lib/plugin')
const HTMLPlugin = require('html-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')

const vueLoaderConfig = require('../vue-loader.config')
const { mergeCSSLoader } = require('../utils')

const isDev = process.env.NODE_ENV === 'development'

module.exports = {
  target: 'electron-renderer',
  entry: {
    renderer: path.join(__dirname, '../../src/renderer/main.js'),
  },
  output: {
    filename: '[name].js',
    libraryTarget: 'commonjs2',
    path: path.join(__dirname, '../../dist/electron'),
    publicPath: './',
  },
  resolve: {
    alias: {
      '@': path.join(__dirname, '../../src/renderer'),
      common: path.join(__dirname, '../../src/common'),
    },
    extensions: ['*', '.js', '.json', '.vue', '.node'],
  },
  module: {
    rules: [
      {
        test: /\.(vue|js)$/,
        use: {
          loader: 'eslint-loader',
          options: {
            formatter: require('eslint-formatter-friendly'),
          },
        },
        exclude: /node_modules/,
        enforce: 'pre',
      },
      {
        test: /\.vue$/,
        loader: 'vue-loader',
        options: vueLoaderConfig,
      },
      {
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        oneOf: mergeCSSLoader(),
      },
      {
        test: /\.less$/,
        oneOf: mergeCSSLoader({
          loader: 'less-loader',
          options: {
            sourceMap: true,
          },
        }),
      },
      {
        test: /\.styl(:?us)?$/,
        oneOf: mergeCSSLoader({
          loader: 'stylus-loader',
          options: {
            sourceMap: true,
          },
        }),
      },
      {
        test: /\.pug$/,
        oneOf: [
          // Use pug-plain-loader handle .vue file
          {
            resourceQuery: /vue/,
            use: ['pug-plain-loader'],
          },
          // Use pug-loader handle .pug file
          {
            use: ['pug-loader'],
          },
        ],
      },
      {
        test: /\.(png|jpe?g|gif|svg)(\?.*)?$/,
        loader: 'url-loader',
        options: {
          limit: 10000,
          name: 'imgs/[name]--[folder].[ext]',
        },
      },
      {
        test: /\.(mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/,
        loader: 'url-loader',
        options: {
          limit: 10000,
          name: 'media/[name]--[folder].[ext]',
        },
      },
      {
        test: /\.(woff2?|eot|ttf|otf)(\?.*)?$/,
        loader: 'url-loader',
        options: {
          limit: 10000,
          name: 'fonts/[name]--[folder].[ext]',
        },
      },
    ],
  },
  performance: {
    maxEntrypointSize: 300000,
  },
  plugins: [
    new HTMLPlugin({
      filename: 'index.html',
      template: path.join(__dirname, '../../src/renderer/index.pug'),
      isProd: process.env.NODE_ENV == 'production',
      browser: process.browser,
      __dirname,
    }),
    new VueLoaderPlugin(),
    new MiniCssExtractPlugin({
      // Options similar to the same options in webpackOptions.output
      // both options are optional
      filename: isDev ? '[name].css' : '[name].[contenthash:8].css',
      chunkFilename: isDev ? '[id].css' : '[id].[contenthash:8].css',
    }),
  ],
}
