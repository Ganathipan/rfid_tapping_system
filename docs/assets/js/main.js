// Main JavaScript for RFID Tapping System Project Page

document.addEventListener('DOMContentLoaded', () => {
  // Initialize AOS (Animate On Scroll)
  if (typeof AOS !== 'undefined') {
    AOS.init({
      duration: 800,
      easing: 'ease-out-cubic',
      once: true,
      offset: 50
    });
  }

  // Carousel Logic
  const carousels = document.querySelectorAll('.carousel-container');
  
  carousels.forEach(carousel => {
    let slideIndex = 0;
    const slides = carousel.querySelectorAll('.carousel-slide');
    
    if (slides.length > 0) {
      showSlides();
      
      function showSlides() {
        for (let i = 0; i < slides.length; i++) {
          slides[i].style.display = "none";
          slides[i].classList.remove('active');
        }
        
        slideIndex++;
        if (slideIndex > slides.length) {slideIndex = 1}
        
        slides[slideIndex-1].style.display = "block";
        slides[slideIndex-1].classList.add('active');
        
        setTimeout(showSlides, 3000); // Change image every 3 seconds
      }
    }
  });

  // Typing Effect for Hero Subtitle (Optional)
  const subtitle = document.querySelector('.hero-subtitle');
  if (subtitle && subtitle.dataset.text) {
    const text = subtitle.dataset.text;
    subtitle.textContent = '';
    let i = 0;
    
    function typeWriter() {
      if (i < text.length) {
        subtitle.textContent += text.charAt(i);
        i++;
        setTimeout(typeWriter, 50);
      }
    }
    
    typeWriter();
  }
});
