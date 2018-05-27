exports.doit = (event, context, callback) => {

    console.log('do it called');
    console.log(event);
    contentType = event.headers['Content-Type']
    console.log(`content type: ${contentType}`)

    callback(null, {
        statusCode: 200,
        body: {
          message: 'Did it',
        }});
}