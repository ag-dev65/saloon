// Shared site behavior for all pages.
const STORAGE_KEY = 'bishoptBarbingBookings';
const API_BASE_URL = window.API_BASE_URL || (
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000'
    : 'https://saloon-cobf.onrender.com'
);

async function submitBookingToBackend(booking) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(booking),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Booking request failed.');
    }

    return await response.json();
  } catch (error) {
    console.warn('Backend submission failed, falling back to localStorage:', error.message);
    return null;
  }
}

function parseBookings() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error('Unable to read bookings from localStorage:', error);
    return [];
  }
}

function saveBookings(bookings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
}

function generateBookingReference() {
  return `GGB-${Math.floor(10000 + Math.random() * 90000)}`;
}

function formatDate(dateString) {
  if (!dateString) return 'Not available';
  const date = new Date(dateString + 'T00:00:00');
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function formatTime(timeString) {
  if (!timeString) return 'Not available';
  const [hour, minute] = timeString.split(':').map(Number);
  const safeDate = new Date();
  safeDate.setHours(hour, minute, 0, 0);

  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(safeDate);
}

function showMessage(element, message, type) {
  if (!element) return;
  element.textContent = message;
  element.className = `form-message ${type}`;
}

function setMinDate() {
  const dateInputs = document.querySelectorAll('#preferredDate');
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const minDate = `${yyyy}-${mm}-${dd}`;

  dateInputs.forEach((input) => {
    input.min = minDate;
  });
}

function injectSelectedService() {
  const serviceSelect = document.getElementById('serviceName');
  if (!serviceSelect) return;

  const params = new URLSearchParams(window.location.search);
  const selectedService = params.get('service');

  if (selectedService) {
    const options = [...serviceSelect.options];
    const match = options.find((option) => option.value === selectedService);
    if (match) {
      serviceSelect.value = selectedService;
    }
  }
}

function toggleMobileNav() {
  const nav = document.querySelector('.site-nav');
  const toggle = document.querySelector('.nav-toggle');

  if (!nav || !toggle) return;

  toggle.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(isOpen));
  });
}

function initServiceFilters() {
  const filterButtons = document.querySelectorAll('.filter-btn');
  const cards = document.querySelectorAll('.service-card');

  if (!filterButtons.length || !cards.length) return;

  filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const activeFilter = button.dataset.filter;
      filterButtons.forEach((btn) => btn.classList.toggle('active', btn === button));

      cards.forEach((card) => {
        const category = card.dataset.category || 'all';
        const shouldShow = activeFilter === 'all' || category === activeFilter;
        card.style.display = shouldShow ? '' : 'none';
      });
    });
  });
}

function initServiceBookingButtons() {
  const serviceButtons = document.querySelectorAll('.service-book-btn');

  serviceButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const serviceName = button.dataset.service;
      const url = new URL('booking.html', window.location.href);
      url.searchParams.set('service', serviceName);
      window.location.href = url.toString();
    });
  });
}

function validateBookingForm(form) {
  const name = form.fullName.value.trim();
  const phone = form.phoneNumber.value.trim();
  const email = form.emailAddress.value.trim();
  const service = form.serviceName.value.trim();
  const date = form.preferredDate.value;
  const time = form.preferredTime.value;

  if (!name || !phone || !email || !service || !date || !time) {
    return 'Please complete all required fields.';
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    return 'Please enter a valid email address.';
  }

  if (phone.replace(/\D/g, '').length < 7) {
    return 'Please enter a valid phone number.';
  }

  const selectedDate = new Date(date + 'T00:00:00');
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (selectedDate < today) {
    return 'Please select a future date.';
  }

  return '';
}

function openBookingModal(booking) {
  const modal = document.getElementById('bookingModal');
  if (!modal) return;

  const modalTitle = document.getElementById('modalTitle');
  const modalMessage = document.getElementById('modalMessage');
  const bookingReference = document.getElementById('bookingReference');

  if (modalTitle && modalMessage && bookingReference) {
    modalTitle.textContent = `Thank you, ${booking.fullName.split(' ')[0]}.`;
    modalMessage.textContent = `Your appointment for ${booking.serviceName} has been booked for ${formatDate(booking.preferredDate)} at ${formatTime(booking.preferredTime)}.`;
    bookingReference.textContent = booking.reference;
  }

  modal.classList.add('visible');
  modal.setAttribute('aria-hidden', 'false');
}

function closeBookingModal() {
  const modal = document.getElementById('bookingModal');
  if (!modal) return;
  modal.classList.remove('visible');
  modal.setAttribute('aria-hidden', 'true');
}

function initBookingForm() {
  const form = document.getElementById('bookingForm');
  const messageBox = document.getElementById('formMessage');
  const closeButton = document.querySelector('.modal-close');

  if (closeButton) {
    closeButton.addEventListener('click', closeBookingModal);
  }

  if (modalBackdropExists()) {
    const modal = document.getElementById('bookingModal');
    modal.addEventListener('click', (event) => {
      if (event.target === modal) closeBookingModal();
    });
  }

  if (!form) return;

  injectSelectedService();
  setMinDate();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const validationMessage = validateBookingForm(form);
    if (validationMessage) {
      showMessage(messageBox, validationMessage, 'error');
      return;
    }

    const booking = {
      id: Date.now(),
      reference: generateBookingReference(),
      fullName: form.fullName.value.trim(),
      phoneNumber: form.phoneNumber.value.trim(),
      emailAddress: form.emailAddress.value.trim(),
      serviceName: form.serviceName.value.trim(),
      preferredDate: form.preferredDate.value,
      preferredTime: form.preferredTime.value,
      additionalMessage: form.additionalMessage.value.trim(),
      status: 'Pending',
      createdAt: new Date().toISOString(),
    };

    const backendResult = await submitBookingToBackend(booking);

    if (backendResult && backendResult.success) {
      booking.reference = backendResult.reference || booking.reference;
      booking.status = backendResult.status || booking.status;
    }

    const existingBookings = parseBookings();
    existingBookings.push(booking);
    saveBookings(existingBookings);

    showMessage(messageBox, 'Booking saved successfully.', 'success');
    form.reset();
    setMinDate();
    openBookingModal(booking);
  });
}

function modalBackdropExists() {
  return !!document.getElementById('bookingModal');
}

function renderAppointments() {
  const tableBody = document.getElementById('appointmentsTableBody');
  const countBox = document.getElementById('bookingCount');

  if (!tableBody) return;

  const bookings = parseBookings();

  if (countBox) {
    countBox.textContent = `${bookings.length} record${bookings.length === 1 ? '' : 's'}`;
  }

  if (!bookings.length) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="8">
          <div class="empty-state">No bookings yet. New salon appointments will appear here.</div>
        </td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = bookings
    .slice()
    .reverse()
    .map((booking) => {
      const statusClass = `status-${booking.status.toLowerCase()}`;
      const statusLabel = booking.status;
      const statusAction = booking.status === 'Pending'
        ? '<button class="action-btn confirm" data-action="confirm" data-id="' + booking.id + '">Mark Confirmed</button>'
        : booking.status === 'Confirmed'
          ? '<button class="action-btn complete" data-action="complete" data-id="' + booking.id + '">Mark Completed</button>'
          : '';

      return `
        <tr>
          <td>
            <strong>${booking.fullName}</strong><br />
            <span>${booking.emailAddress}</span>
          </td>
          <td>${booking.phoneNumber}</td>
          <td>${booking.serviceName}</td>
          <td>${formatDate(booking.preferredDate)}</td>
          <td>${formatTime(booking.preferredTime)}</td>
          <td>${booking.reference}</td>
          <td><span class="status-pill ${statusClass}">${statusLabel}</span></td>
          <td>
            <div class="appointment-actions">
              ${statusAction}
              <button class="action-btn delete" data-action="delete" data-id="${booking.id}">Delete</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join('');

  attachAppointmentActions();
}

function attachAppointmentActions() {
  const buttons = document.querySelectorAll('[data-action]');

  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      const id = Number(button.dataset.id);
      const action = button.dataset.action;
      const bookings = parseBookings();

      if (action === 'delete') {
        const filtered = bookings.filter((booking) => booking.id !== id);
        saveBookings(filtered);
        renderAppointments();
        return;
      }

      const updated = bookings.map((booking) => {
        if (booking.id === id) {
          if (action === 'confirm') booking.status = 'Confirmed';
          if (action === 'complete') booking.status = 'Completed';
        }
        return booking;
      });

      saveBookings(updated);
      renderAppointments();
    });
  });
}

function initContactForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = form.contactName.value.trim();
    const email = form.contactEmail.value.trim();
    const subject = form.contactSubject.value.trim();
    const message = form.contactMessage.value.trim();

    if (!name || !email || !subject || !message) {
      alert('Please fill in all contact form fields.');
      return;
    }

    alert('Thank you for your message. Our team will get back to you soon.');
    form.reset();
  });
}

function initRevealAnimations() {
  const revealItems = document.querySelectorAll('.reveal');
  if (!revealItems.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.18 }
  );

  revealItems.forEach((item) => observer.observe(item));
}

document.addEventListener('DOMContentLoaded', () => {
  toggleMobileNav();
  initRevealAnimations();
  initBookingForm();
  initContactForm();
  initServiceFilters();
  initServiceBookingButtons();
  renderAppointments();
});
