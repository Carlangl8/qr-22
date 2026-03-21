document.addEventListener('DOMContentLoaded', () => {
  const listContainer = document.getElementById('guest-list-container');
  const statTotal = document.getElementById('stat-total');
  const statArrived = document.getElementById('stat-arrived');
  const statPending = document.getElementById('stat-pending');

  async function loadGuests() {
    try {
      const resp = await fetch('/api/invitados');
      const data = await resp.json();
      
      if (!data.ok) throw new Error("Error loading data");

      const guests = data.invitados || [];
      
      const total = guests.length;
      const arrived = guests.filter(g => g.llegado).length;
      const pending = total - arrived;

      statTotal.textContent = total;
      statArrived.textContent = arrived;
      statPending.textContent = pending;

      guests.sort((a, b) => {
        if (a.llegado !== b.llegado) return a.llegado ? 1 : -1;
        if (a.llegado && b.llegado) {
          return new Date(b.llegadoEn) - new Date(a.llegadoEn);
        }
        return new Date(a.creadoEn) - new Date(b.creadoEn);
      });

      if (guests.length === 0) {
        listContainer.innerHTML = '<p style="text-align: center; color: #c4b5fd;">No hay invitados todavía.</p>';
        return;
      }

      listContainer.innerHTML = '';
      guests.forEach(guest => {
        const item = document.createElement('div');
        item.className = 'guest-item';

        const statusClass = guest.llegado ? 'arrived' : 'pending';
        const statusText = guest.llegado ? 'Ha llegado' : 'Pendiente';
        
        let timeText = '';
        if (guest.llegado && guest.llegadoEn) {
          const time = new Date(guest.llegadoEn);
          timeText = `Llegó a las ${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;
        } else if (guest.creadoEn) {
          const time = new Date(guest.creadoEn);
          timeText = `Invitación: ${time.toLocaleDateString()} ${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;
        }

        let nombreParaMostrar = guest.nombre;
        if (guest.nombre.trim().toLowerCase() === "romero") {
          nombreParaMostrar = guest.nombre + " ❤️ 🐵";
        }

        item.innerHTML = `
          <div class="guest-info">
            <h4>${nombreParaMostrar}</h4>
            <div class="time">${timeText}</div>
          </div>
          <div class="status-badge ${statusClass}">
            ${statusText}
          </div>
        `;
        listContainer.appendChild(item);
      });

    } catch (err) {
      console.error(err);
      if (listContainer.children.length === 0 || listContainer.innerHTML.includes('Cargando')) {
        listContainer.innerHTML = '<p style="text-align: center; color: #fbbf24;">Error al cargar la lista. Reintentando...</p>';
      }
    }
  }

  loadGuests();
  setInterval(loadGuests, 3000);
});
