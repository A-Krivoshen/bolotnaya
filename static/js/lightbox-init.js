
document.addEventListener('DOMContentLoaded', function () {
  if (typeof GLightbox === 'undefined') return;
  GLightbox({
    selector: '.glightbox',
    touchNavigation: true,
    loop: true
  });
});
