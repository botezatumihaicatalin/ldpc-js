var path = require('path')

var buildFolder   = path.join(__dirname, 'build')
var buildFilename = 'bundle.js'

var entryFilepath = path.join(__dirname, 'src', 'Index.js6')

module.exports = {
    entry:  entryFilepath,
    output: {
        path:     buildFolder,
        filename: buildFilename
    },
    resolve: {
        extensions: [ '', '.js', '.js6' ]
    },
    target: 'node',
    module: {
        loaders: [
            {
                test:   /\.css$/,
                loader: 'style!css'
            },
            {
                test:    /\.js6$/,
                exclude: /node_modules/,
                loader:  'babel-loader',
                query: {
                    presets: ['es2015']
                }
            },
            {
                test:   /\.json$/,
                loader: 'json-loader'
            },
            {
                test:   /\.node$/,
                loader: 'node-loader'
            }
        ]
    }
}
