// Jr. Lancers Basketball - Theme Toggle

(function() {
  // Always start in dark mode (Lancers black theme)
  const savedTheme = localStorage.getItem('lancers-theme') || 'dark';

  if (savedTheme === 'light') {
    document.documentElement.classList.add('light-mode');
    document.body.classList.add('light-mode');
  }

  // Theme toggle function
  window.toggleTheme = function() {
    const isLight = document.body.classList.contains('light-mode');

    if (isLight) {
      document.documentElement.classList.remove('light-mode');
      document.body.classList.remove('light-mode');
      localStorage.setItem('lancers-theme', 'dark');
    } else {
      document.documentElement.classList.add('light-mode');
      document.body.classList.add('light-mode');
      localStorage.setItem('lancers-theme', 'light');
    }
  };

  // Apply theme on page load
  document.addEventListener('DOMContentLoaded', function() {
    if (savedTheme === 'light') {
      document.documentElement.classList.add('light-mode');
      document.body.classList.add('light-mode');
    }
  });
})();
