exports.doit = (event, context, callback) => {

    console.log('do it called')
    console.log(event);
    callback(null, {
        statusCode: 200,
        body: JSON.stringify({
          message: 'Did it',
        })});
}