import React from 'react';
import { Settings, Upload, Lock, Phone, MapPin, Tag, Clock, ShieldCheck, Store, Save, ArrowLeft, Mail } from 'lucide-react';

export default function SettingsTab({
  restaurant,
  profileForm,
  updateProfileField,
  fileInputRef,
  handleLogoUpload,
  setShowPasswordModal,
  setShowEmailModal,
  isAcceptingOrders,
  openDaysCount,
  DAYS,
  selectedHourDay,
  setSelectedHourDay,
  hoursForm,
  updateHoursField,
  saveOperatingHours,
  hoursError,
  hoursSuccess,
  hoursSaving,
  profileLoading,
  profileError,
  profileSuccess,
  handleUpdateProfile,
  setActiveTab
}) {
  return (
    <div className="animate-fade-in max-w-7xl space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => setActiveTab('orders')} className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition text-gray-600 flex items-center justify-center">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h2 className="text-xl font-black tracking-tighter uppercase leading-none">Settings</h2>
      </div>
      <div className="overflow-hidden rounded-[28px] border border-gray-200 bg-gradient-to-br from-[#f6f1e8] via-white to-[#eef3f1] shadow-[0_28px_70px_-40px_rgba(15,23,42,0.35)]">
        <div className="grid gap-6 px-5 py-6 sm:px-7 lg:grid-cols-[minmax(0,1.35fr)_300px] lg:px-8 lg:py-8">
          <div className="space-y-8">
            <div className="space-y-6">
              <div className="space-y-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/80 px-3 py-1 text-[9px] font-black uppercase tracking-[0.28em] text-gray-600 shadow-sm">
                  <Settings size={12} className="text-gray-500" />
                  Restaurant Settings
                </span>
                <div className="space-y-3">
                  <h2 className="text-2xl font-black uppercase tracking-[-0.06em] text-gray-950 md:text-4xl">
                    Shape how your brand feels before the first order arrives.
                  </h2>
                  <p className="max-w-2xl text-sm leading-6 text-gray-600">
                    Update your restaurant identity, customer-facing details, and operating rules from one clean control center.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-10 items-center justify-center gap-2 rounded-[14px] border border-gray-200 bg-white px-5 text-[9px] font-black uppercase tracking-[0.15em] text-gray-800 transition hover:border-black hover:text-black"
                >
                  <Upload size={13} />
                  Upload Logo
                </button>
                <button
                  onClick={() => setShowPasswordModal(true)}
                  type="button"
                  className="flex h-10 items-center justify-center gap-2 rounded-[14px] bg-black px-5 text-[9px] font-black uppercase tracking-[0.15em] text-white transition hover:bg-gray-800"
                >
                  <Lock size={13} />
                  Change Password
                </button>
                <button
                  onClick={() => setShowEmailModal(true)}
                  type="button"
                  className="flex h-10 items-center justify-center gap-2 rounded-[14px] border border-gray-200 bg-white px-5 text-[9px] font-black uppercase tracking-[0.15em] text-gray-800 transition hover:border-black hover:text-black"
                >
                  <Mail size={13} />
                  Change Email
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-6 items-start rounded-2xl pt-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="group relative flex h-[110px] w-[110px] shrink-0 flex-col items-center justify-center gap-2 rounded-[24px] border border-black/5 bg-white shadow-sm transition hover:border-black/20"
              >
                {restaurant?.logo ? (
                  <img src={restaurant?.logo} alt="Logo" className="absolute inset-0 h-full w-full rounded-[24px] object-cover" />
                ) : (
                  <>
                    <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-black text-lg font-black text-white">
                      {profileForm?.name?.charAt(0) || restaurant?.name?.charAt(0) || 'R'}
                    </div>
                    <span className="text-[7.5px] font-black uppercase tracking-[0.1em] text-gray-500 group-hover:text-black">
                      Add Logo
                    </span>
                  </>
                )}
              </button>

              <div className="space-y-4 flex-1">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.26em] text-gray-400">Current Profile</p>
                  <h3 className="mt-1.5 text-xl font-black uppercase tracking-tight text-gray-950">
                    {profileForm?.name || restaurant?.name || 'Restaurant Name'}
                  </h3>
                  <p className="mt-1.5 text-[12px] text-gray-500 font-medium">
                    {profileForm?.description || restaurant?.description || 'Add a short description so customers immediately understand your style, cuisine, and atmosphere.'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-4">
                  <span className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-transparent px-3 py-1.5 text-[9px] font-black text-gray-700">
                    <Mail size={12} className="text-gray-400" />
                    {restaurant?.email || 'No email associated'}
                  </span>
                  <span className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-transparent px-3 py-1.5 text-[9px] font-black text-gray-700">
                    <Phone size={12} className="text-gray-400" />
                    {profileForm?.phone || restaurant?.phone || 'No phone added'}
                  </span>
                  <span className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-transparent px-3 py-1.5 text-[9px] font-black text-gray-700">
                    <MapPin size={12} className="text-gray-400" />
                    {profileForm?.address || restaurant?.address ? 'Location added' : 'Location incomplete'}
                  </span>
                  <span className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-transparent px-3 py-1.5 text-[9px] font-black text-gray-700">
                    <Tag size={12} className="text-gray-400" />
                    {profileForm?.cuisineTags || restaurant?.cuisineTags?.length > 0 ? 'Cuisine tags active' : '0 cuisine tags'}
                  </span>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-gray-500 font-medium pb-1">
              Tap the logo tile to upload or replace your restaurant image without leaving settings.
            </p>

            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleLogoUpload} className="hidden" />
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 self-start h-fit">
            <div className="rounded-[22px] border border-black/10 bg-white/85 p-4 shadow-sm">
              <p className="text-[9px] font-black uppercase tracking-[0.26em] text-gray-400">Store Status</p>
              <div className="mt-3 flex items-center gap-3">
                <span className={`h-2.5 w-2.5 rounded-full ${isAcceptingOrders ? 'bg-green-500' : 'bg-gray-300'}`} />
                <p className="text-sm font-black uppercase tracking-wide text-gray-900">
                  {isAcceptingOrders ? 'Accepting Orders' : 'Paused'}
                </p>
              </div>
            </div>
            <div className="rounded-[22px] border border-black/10 bg-white/85 p-4 shadow-sm">
              <p className="text-[9px] font-black uppercase tracking-[0.26em] text-gray-400">Open Days</p>
              <p className="mt-3 text-3xl font-black tracking-[-0.06em] text-gray-950">
                {openDaysCount}
              </p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-gray-500">Days active in current schedule</p>
            </div>
            <div className="rounded-[22px] border border-black/10 bg-white/85 p-4 shadow-sm">
              <p className="text-[9px] font-black uppercase tracking-[0.26em] text-gray-400">Sync Mode</p>
              <div className="mt-3 flex items-start gap-3">
                <ShieldCheck size={16} className="mt-0.5 text-gray-400" />
                <p className="text-[11px] font-bold uppercase tracking-widest leading-5 text-gray-600">
                  Automatic status sync is active. Hours update your live store availability.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {profileError && <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-red-600 shadow-sm">{profileError}</div>}
      {profileSuccess && <div className="rounded-2xl border border-green-100 bg-green-50 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-green-700 shadow-sm">{profileSuccess}</div>}

      <form onSubmit={handleUpdateProfile} className="grid gap-5 pb-32 xl:grid-cols-[minmax(0,1fr)_370px]">

        <div className="grid gap-6 xl:col-span-2 xl:grid-cols-[minmax(0,1fr)_370px]">

          <div className="space-y-5">
            {/* --- BRAND IDENTITY --- */}
            <div className="rounded-[24px] border border-gray-200 bg-white p-5 sm:p-6 shadow-sm">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-gray-950">
                    <Store size={15} /> Brand Identity
                  </h3>
                  <p className="mt-1 text-[13px] text-gray-500">Logo, name, and description shown across the storefront and dashboard.</p>
                </div>
                <span className="rounded-full bg-gray-100 px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.15em] text-gray-600">Primary</span>
              </div>
              <div className="mb-5 border-t border-gray-100"></div>

              <div className="grid gap-4 md:grid-cols-[1fr_2fr]">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-[0.1em] text-gray-500">Restaurant Name</label>
                  <input
                    type="text"
                    value={profileForm?.name || ''}
                    onChange={e => updateProfileField('name', e.target.value)}
                    className="w-full rounded-[14px] border border-gray-200 bg-[#FCFCFC] px-4 py-3 text-sm font-semibold text-gray-900 outline-none transition focus:border-black focus:bg-white"
                    placeholder="e.g. SHIMLA BIRYANI"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-[0.1em] text-gray-500">Restaurant Description</label>
                  <textarea
                    value={profileForm?.description || ''}
                    onChange={e => updateProfileField('description', e.target.value)}
                    className="min-h-[50px] w-full rounded-[14px] border border-gray-200 bg-[#FCFCFC] px-4 py-3 text-sm font-semibold text-gray-800 outline-none transition focus:border-black focus:bg-white resize-none"
                    placeholder="A brief overview of your restaurant..."
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end pt-4 border-t border-gray-100">
                <button type="submit" disabled={profileLoading} className="flex h-11 items-center justify-center gap-2 rounded-[14px] bg-black px-6 text-[10px] font-black uppercase tracking-[0.15em] text-white transition hover:bg-gray-900 disabled:opacity-50">
                  <Save size={14} /> {profileLoading ? 'Saving...' : 'Save Identity'}
                </button>
              </div>
            </div>

            {/* --- CONTACT AND LOCATION --- */}
            <div className="rounded-[24px] border border-gray-200 bg-white p-5 sm:p-6 shadow-sm">
              <div className="mb-4">
                <h3 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-gray-950">
                  <MapPin size={15} /> Contact and Location
                </h3>
                <p className="mt-1 text-[13px] text-gray-500">Make sure customers can reach you easily and find the restaurant without friction.</p>
              </div>
              <div className="mb-5 border-t border-gray-100"></div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-[0.1em] text-gray-500">Contact Phone</label>
                  <input
                    type="text"
                    value={profileForm?.phone || ''}
                    onChange={e => updateProfileField('phone', e.target.value)}
                    className="w-full rounded-[14px] border border-gray-200 bg-[#FCFCFC] px-4 py-3 text-sm font-semibold text-gray-900 outline-none transition focus:border-black focus:bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-[0.1em] text-gray-500">City</label>
                  <input
                    type="text"
                    value={profileForm?.city || ''}
                    onChange={e => updateProfileField('city', e.target.value)}
                    className="w-full rounded-[14px] border border-gray-200 bg-[#FCFCFC] px-4 py-3 text-sm font-semibold text-gray-900 outline-none transition focus:border-black focus:bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-[0.1em] text-gray-500">Pincode</label>
                  <input
                    type="text"
                    value={profileForm?.pincode || ''}
                    onChange={e => updateProfileField('pincode', e.target.value)}
                    className="w-full rounded-[14px] border border-gray-200 bg-[#FCFCFC] px-4 py-3 text-sm font-semibold text-gray-900 outline-none transition focus:border-black focus:bg-white"
                  />
                </div>
              </div>
              <div className="mt-4 space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-[0.1em] text-gray-500">Street Address</label>
                <textarea
                  value={profileForm?.address || ''}
                  onChange={e => updateProfileField('address', e.target.value)}
                  className="min-h-[50px] w-full rounded-[14px] border border-gray-200 bg-[#FCFCFC] px-4 py-3 text-sm font-semibold text-gray-800 outline-none transition focus:border-black focus:bg-white resize-none"
                />
              </div>
              <div className="mt-6 flex justify-end pt-4 border-t border-gray-100">
                <button type="submit" disabled={profileLoading} className="flex h-11 items-center justify-center gap-2 rounded-[14px] bg-black px-6 text-[10px] font-black uppercase tracking-[0.15em] text-white transition hover:bg-gray-900 disabled:opacity-50">
                  <Save size={14} /> {profileLoading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>

            {/* --- ADDITIONAL SPECS --- */}
            <div className="rounded-[24px] border border-gray-200 bg-white p-5 sm:p-6 shadow-sm">
              <div className="mb-4">
                <h3 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-gray-950">
                  <Tag size={15} /> Additional Specs
                </h3>
                <p className="mt-1 text-[13px] text-gray-500">Extra metadata that helps with discoverability and customer messaging.</p>
              </div>
              <div className="mb-5 border-t border-gray-100"></div>

              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-[0.1em] text-gray-500">Cuisine Tags (Comma Separated)</label>
                  <input
                    type="text"
                    value={profileForm?.cuisineTags || ''}
                    onChange={e => updateProfileField('cuisineTags', e.target.value)}
                    className="w-full rounded-[14px] border border-gray-200 bg-[#FCFCFC] px-4 py-3 text-sm font-semibold text-gray-900 outline-none transition focus:border-black focus:bg-white"
                    placeholder="Cafe"
                  />
                  <p className="text-[8px] font-black uppercase tracking-[0.1em] text-gray-400">Tags improve discoverability and categorization.</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-[0.1em] text-gray-500">Customer Message</label>
                  <textarea
                    value={profileForm?.customMessage || ''}
                    onChange={e => updateProfileField('customMessage', e.target.value)}
                    className="min-h-[60px] w-full rounded-[14px] border border-gray-200 bg-[#FCFCFC] px-4 py-3 text-sm font-semibold text-gray-900 outline-none transition focus:border-black focus:bg-white resize-none"
                    placeholder="Thank you for dining with us! We hope you enjoy your meal."
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end pt-4 border-t border-gray-100">
                <button type="submit" disabled={profileLoading} className="flex h-11 items-center justify-center gap-2 rounded-[14px] bg-black px-6 text-[10px] font-black uppercase tracking-[0.15em] text-white transition hover:bg-gray-900 disabled:opacity-50">
                  <Save size={14} /> {profileLoading ? 'Saving...' : 'Save Specs'}
                </button>
              </div>
            </div>
          </div>

          {/* --- SECTION: Operating Hours --- */}
          <div className="xl:sticky xl:top-24 xl:self-start">
            <div className="overflow-hidden rounded-[26px] border border-gray-200 bg-white p-5 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.35)]">
              <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3">
                <div>
                  <h3 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-gray-950">
                    <Clock size={14} /> Opening Hours
                  </h3>
                  <p className="mt-0.5 text-[11px] text-gray-500">Set daily timings</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-[0.1em] text-gray-500">Select Day</label>
                  <select
                    value={selectedHourDay}
                    onChange={e => setSelectedHourDay(e.target.value)}
                    className="w-full appearance-none rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 outline-none transition hover:border-gray-300 focus:border-black capitalize"
                    style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")", backgroundPosition: "right 0.5rem center", backgroundRepeat: "no-repeat", backgroundSize: "1.5em 1.5em", paddingRight: "2.5rem" }}
                  >
                    {DAYS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div className="rounded-[24px] border border-gray-100 bg-[#faf8f4] p-4 shadow-sm">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <p className="text-sm font-black uppercase tracking-[0.15em] text-gray-900">{selectedHourDay}</p>
                    {(() => {
                      const isDayOpen = hoursForm[selectedHourDay]?.isOpen !== false;
                      return (
                        <button
                          type="button"
                          onClick={() => updateHoursField(selectedHourDay, 'isOpen', !isDayOpen)}
                          className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isDayOpen ? 'bg-[#00c853]' : 'bg-gray-200'}`}
                        >
                          <span className={`pointer-events-none inline-block h-[24px] w-[24px] transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isDayOpen ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                      );
                    })()}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase tracking-[0.1em] text-gray-500">Opens At</label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="HH:MM"
                          maxLength={5}
                          value={hoursForm[selectedHourDay]?.open ?? '09:00'}
                          disabled={hoursForm[selectedHourDay]?.isOpen === false}
                          onChange={e => {
                            const val = e.target.value.replace(/[^0-9:]/g, '');
                            updateHoursField(selectedHourDay, 'open', val);
                          }}
                          onBlur={e => {
                            let val = e.target.value.trim();
                            if (val && !val.includes(':') && val.length <= 4) {
                              if (val.length === 3) val = `0${val[0]}:${val.slice(1)}`;
                              else if (val.length === 4) val = `${val.slice(0, 2)}:${val.slice(2)}`;
                              else if (val.length <= 2) val = `${val.padStart(2, '0')}:00`;
                              updateHoursField(selectedHourDay, 'open', val);
                            } else if (val && val.includes(':')) {
                              const [h, m] = val.split(':');
                              val = `${(h || '00').padStart(2, '0')}:${(m || '00').padEnd(2, '0')}`;
                              updateHoursField(selectedHourDay, 'open', val.slice(0, 5));
                            }
                          }}
                          className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 pr-10 text-sm font-semibold text-gray-900 outline-none transition focus:border-black disabled:bg-gray-50 disabled:text-gray-400"
                        />
                        <Clock size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase tracking-[0.1em] text-gray-500">Closes At</label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="HH:MM"
                          maxLength={5}
                          value={hoursForm[selectedHourDay]?.close ?? '22:00'}
                          disabled={hoursForm[selectedHourDay]?.isOpen === false}
                          onChange={e => {
                            const val = e.target.value.replace(/[^0-9:]/g, '');
                            updateHoursField(selectedHourDay, 'close', val);
                          }}
                          onBlur={e => {
                            let val = e.target.value.trim();
                            if (val && !val.includes(':') && val.length <= 4) {
                              if (val.length === 3) val = `0${val[0]}:${val.slice(1)}`;
                              else if (val.length === 4) val = `${val.slice(0, 2)}:${val.slice(2)}`;
                              else if (val.length <= 2) val = `${val.padStart(2, '0')}:00`;
                              updateHoursField(selectedHourDay, 'close', val);
                            } else if (val && val.includes(':')) {
                              const [h, m] = val.split(':');
                              val = `${(h || '00').padStart(2, '0')}:${(m || '00').padEnd(2, '0')}`;
                              updateHoursField(selectedHourDay, 'close', val.slice(0, 5));
                            }
                          }}
                          className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 pr-10 text-sm font-semibold text-gray-900 outline-none transition focus:border-black disabled:bg-gray-50 disabled:text-gray-400"
                        />
                        <Clock size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4">
                {hoursError && <p className="mb-2 text-[10px] font-bold text-red-600 uppercase tracking-widest">{hoursError}</p>}
                {hoursSuccess && <p className="mb-2 text-[10px] font-bold text-green-600 uppercase tracking-widest">{hoursSuccess}</p>}
                <button
                  type="button"
                  disabled={hoursSaving}
                  onClick={saveOperatingHours}
                  className="flex h-14 w-full items-center justify-center rounded-[18px] bg-black px-4 text-[10px] font-black uppercase tracking-[0.2em] text-white transition hover:bg-gray-900 disabled:opacity-50"
                >
                  <Save size={14} className="mr-2" /> {hoursSaving ? 'Saving...' : 'Save Hours'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
