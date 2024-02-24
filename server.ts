import { serve } from 'bun';

serve({
  port: process.env.PORT || 3000,
  fetch(request) {
    if (request.url.endsWith('/') || request.url.endsWith('/index.html')) {
      return new Response(Bun.file('./index.html'));
    }

    const url = new URL(request.url);
    const path = url.pathname;
    return new Response(Bun.file(`.${path}`));
  },
});

console.log(`Boxcar running at http://localhost:` + (process.env.PORT || 3000));
