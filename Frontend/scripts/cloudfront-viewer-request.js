/**
 * CloudFront Function (viewer request) for Next.js static export on S3.
 *
 * AWS Console: CloudFront → Functions → Create → paste this file → Publish.
 * Then: Behaviors → Edit → Function associations → Viewer request → select function.
 *
 * Replaces Apache .htaccess and Netlify _redirects (ignored by S3/CloudFront).
 */
function handler(event) {
  var request = event.request;
  var uri = request.uri;

  // /properties/<slug-or-id> → shared client-render shell (see public/_redirects)
  var propertyDetail = uri.match(/^\/properties\/([^/.]+)\/?$/);
  if (propertyDetail && propertyDetail[1] !== "__detail__") {
    request.uri = "/properties/__detail__/index.html";
    return request;
  }

  // /admin/login, /contact, etc. → folder index.html
  if (!uri.includes(".") && !uri.endsWith("/")) {
    request.uri = uri + "/index.html";
  } else if (uri.endsWith("/")) {
    request.uri = uri + "index.html";
  }

  return request;
}
