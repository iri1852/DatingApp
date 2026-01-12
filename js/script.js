// Supabase Configuration
const SUPABASE_URL = 'https://jwlysukkajzgxbjymzxt.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3bHlzdWtrYWp6Z3hianltenh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNTE5NzIsImV4cCI6MjA4MzcyNzk3Mn0.LvNzHeX5nPEE4NCKrERllnVs8jUxre48l8pXmPBTGnM';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Router - Handle view switching
 */
function showView(viewName) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    
    if (viewName === 'home') {
        document.getElementById('homeView').classList.add('active');
        fetchDates();
    } else if (viewName === 'add') {
        document.getElementById('formView').classList.add('active');
        resetForm();
        document.getElementById('formTitle').innerText = "Nieuw idee toevoegen";
    } else if (viewName === 'edit') {
        document.getElementById('formView').classList.add('active');
        document.getElementById('formTitle').innerText = "Date Aanpassen";
    }
}

/**
 * Reset form fields
 */
function resetForm() {
    document.getElementById('editId').value = '';
    document.getElementById('title').value = '';
    document.getElementById('description').value = '';
    document.getElementById('createdBy').value = '';
    document.getElementById('dateSuggested').value = '';
    document.getElementById('imageFile').value = '';
}

/**
 * Fetch all dates from Supabase and display them
 */
async function fetchDates() {
    try {
        const { data, error } = await supabaseClient
            .from('DatingDB')
            .select('*')
            .order('id', { ascending: false });
        
        if (error) {
            console.error('Error fetching dates:', error);
            return;
        }

        const grid = document.getElementById('datesGrid');
        grid.innerHTML = '';

        data.forEach(date => {
            const img = date.image_url ? date.image_url : 'https://via.placeholder.com/400x200?text=Geen+foto';
            const dateCard = createDateCard(date, img);
            grid.appendChild(dateCard);
        });
    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

/**
 * Create a date card DOM element
 */
function createDateCard(date, imageUrl) {
    const card = document.createElement('div');
    card.className = 'bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition cursor-pointer group';
    
    card.innerHTML = `
        <img src="${imageUrl}" class="h-48 w-full object-cover" alt="${date.title}">
        <div class="p-5">
            <div class="flex justify-between items-start">
                <h3 class="text-lg font-bold text-gray-900">${date.title}</h3>
                <span class="bg-indigo-100 text-indigo-700 text-xs px-2 py-1 rounded-full">${date.created_by || 'Onbekend'}</span>
            </div>
            <p class="text-gray-500 text-sm mt-2 line-clamp-2">${date.description || ''}</p>
            <div class="mt-4 flex justify-between items-center">
                <span class="text-xs text-gray-400">📅 ${date.date_suggested || 'Nog geen datum'}</span>
                <button onclick="editDate(${JSON.stringify(date).replace(/"/g, '&quot;')})" class="text-indigo-600 font-medium text-sm hover:underline">Aanpassen</button>
            </div>
        </div>
    `;
    
    return card;
}

/**
 * Save a new date or update existing date
 */
async function saveDate() {
    const btn = document.getElementById('saveBtn');
    const id = document.getElementById('editId').value;
    const file = document.getElementById('imageFile').files[0];
    
    // Validate required field
    const title = document.getElementById('title').value.trim();
    if (!title) {
        alert('Please enter a title');
        return;
    }

    btn.disabled = true;
    btn.innerText = "Bezig met verwerken...";

    try {
        let imageUrl = null;

        // Upload image to Supabase Storage if provided
        if (file) {
            imageUrl = await uploadImage(file);
        }

        const payload = {
            title: title,
            description: document.getElementById('description').value,
            created_by: document.getElementById('createdBy').value,
            date_suggested: document.getElementById('dateSuggested').value || null
        };

        if (imageUrl) {
            payload.image_url = imageUrl;
        }

        let result;
        if (id) {
            // Update existing record
            result = await supabaseClient
                .from('DatingDB')
                .update(payload)
                .eq('id', id);
        } else {
            // Insert new record
            result = await supabaseClient
                .from('DatingDB')
                .insert([payload]);
        }

        if (result.error) {
            alert("Fout: " + result.error.message);
        } else {
            showView('home');
        }
    } catch (err) {
        console.error('Error saving date:', err);
        alert("Er is een fout opgetreden: " + err.message);
    } finally {
        btn.disabled = false;
        btn.innerText = "Opslaan ✨";
    }
}

/**
 * Upload image to Supabase Storage
 */
async function uploadImage(file) {
    const fileName = `${Date.now()}_${file.name}`;
    
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
        .from('date-photos')
        .upload(fileName, file);
    
    if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error('Image upload failed');
    }

    const { data: urlData } = supabaseClient.storage
        .from('date-photos')
        .getPublicUrl(fileName);
    
    return urlData.publicUrl;
}

/**
 * Load date data into form for editing
 */
function editDate(date) {
    showView('edit');
    document.getElementById('editId').value = date.id;
    document.getElementById('title').value = date.title;
    document.getElementById('description').value = date.description || '';
    document.getElementById('createdBy').value = date.created_by || '';
    document.getElementById('dateSuggested').value = date.date_suggested || '';
}

// Initialize - Load dates on page load
document.addEventListener('DOMContentLoaded', function() {
    fetchDates();
});
