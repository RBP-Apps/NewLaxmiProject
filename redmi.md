create table public.portal (
  timestamp timestamp with time zone null,
  serial_no character varying(50) null,
  reg_id character varying(100) not null,
  beneficiary_name character varying(200) null,
  fathers_name character varying(200) null,
  mobile_number character varying(15) null,
  village character varying(100) null,
  block character varying(100) null,
  district character varying(100) null,
  pincode character varying(10) null,
  pump_capacity character varying(50) null,
  pump_head character varying(50) null,
  ip_name character varying(200) null,
  planned_1 timestamp with time zone null,
  actual_1 timestamp with time zone null,
  delay_1 text null,
  amount integer null,
  last_updated_by text null,
  constraint portal_pkey primary key (reg_id)
) TABLESPACE pg_default;

create trigger portal_after_insert
after INSERT on portal for EACH row
execute FUNCTION insert_into_other_tables ();

create trigger portal_sync_trigger
after INSERT
or
update on portal for EACH row
execute FUNCTION sync_portal_to_sheet ();

create table public.survey (
  id serial not null,
  planned_2 date null,
  actual_2 date null,
  delay_2 integer null,
  survey_status character varying(100) null default 'Pending'::character varying,
  survey_dt date null,
  survey_file text null,
  timestamp timestamp with time zone null default CURRENT_TIMESTAMP,
  survey_remarks text null,
  surveyor_name character varying(200) null,
  is_approved boolean null default false,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  serial_no character varying null,
  reg_id character varying not null,
  constraint survey_pkey primary key (id, reg_id)
) TABLESPACE pg_default;

create trigger trigger_survey_after_update
after
update on survey for EACH row
execute FUNCTION insert_dispatch_on_survey_update ();



create table public.dispatch_material (
  id serial not null,
  planned_3 character varying(50) null,
  actual_3 character varying(50) null,
  delay_3 character varying(50) null,
  dispatched_plan character varying(100) null,
  plan_date date null,
  material_received character varying(50) null,
  material_received_date date null,
  material_chalan_link text null,
  invoice_no character varying(100) null,
  way_bill_no character varying(100) null,
  date date null,
  timestamp timestamp with time zone null default CURRENT_TIMESTAMP,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  serial_no character varying null,
  reg_id character varying not null,
  constraint dispatch_material_pkey primary key (id, reg_id)
) TABLESPACE pg_default;

create trigger trigger_dispatch_material_after_update
after
update on dispatch_material for EACH row
execute FUNCTION insert_installation_on_dispatch_update ();




create table public.installation (
  id serial not null,
  planned_4 character varying(50) null,
  actual_4 character varying(50) null,
  delay_4 character varying(50) null,
  installation_status character varying(100) null,
  installation_date date null,
  photo_uploaded_on_upad_app text null,
  timestamp timestamp with time zone null default CURRENT_TIMESTAMP,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  serial_no character varying null,
  reg_id character varying not null,
  constraint installation_pkey primary key (id, reg_id)
) TABLESPACE pg_default;

create trigger trigger_installation_after_update
after
update on installation for EACH row
execute FUNCTION insert_portal_update_on_installation_update ();



create table public.portal_update (
  id serial not null,
  planned_5 character varying(50) null,
  actual_5 character varying(50) null,
  delay_5 character varying(50) null,
  photo_link text null,
  photo_rms_data_pending character varying(100) null,
  longitude double precision null,
  latitude numeric(11, 8) null,
  supply_aapurti_date date null,
  scadalot_creation character varying(100) null,
  lot_ref_no character varying(100) null,
  lot_name character varying(200) null,
  asset_mapping_by_ea character varying(100) null,
  days_7_verification character varying(100) null,
  rms_data_mail_to_rotommag text null,
  timestamp timestamp with time zone null default CURRENT_TIMESTAMP,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  serial_no character varying null,
  reg_id character varying not null,
  photo_links text[] null,
  pump_no text null,
  motor_no text null,
  controller_no text null,
  rid text null,
  constraint portal_update_pkey primary key (id, reg_id)
) TABLESPACE pg_default;

create trigger trigger_portal_update_after_update
after
update on portal_update for EACH row
execute FUNCTION insert_invoicing_on_portal_update_update ();


create table public.invoicing (
  id serial not null,
  planned_6 character varying(50) null,
  actual_6 character varying(50) null,
  delay_6 character varying(50) null,
  raisoni_invoice_no character varying(100) null,
  invoice_date date null,
  raisoni_invoice_link text null,
  laxmi_invoice_link text null,
  timestamp timestamp with time zone null default CURRENT_TIMESTAMP,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  serial_no character varying null,
  reg_id character varying not null,
  laxmi_invoice_date date null,
  laxmi_invoice_no character varying(50) null,
  constraint invoicing_pkey primary key (id, reg_id)
) TABLESPACE pg_default;

create trigger trigger_invoicing_after_update
after
update on invoicing for EACH row
execute FUNCTION insert_system_info_on_invoicing_update ();


create table public.beneficiary_share (
  id serial not null,
  planned_9 date null,
  actual_9 date null,
  delay_9 integer null,
  state_share_amt numeric(15, 2) null,
  state_share_dt date null,
  farmer_share_amt numeric(15, 2) null,
  farmer_share_dt date null,
  timestamp timestamp with time zone null default CURRENT_TIMESTAMP,
  payment_mode character varying(50) null,
  transaction_id character varying(100) null,
  bank_name character varying(200) null,
  account_number character varying(50) null,
  ifsc_code character varying(20) null,
  payment_status character varying(50) null default 'Pending'::character varying,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  serial_no character varying null,
  reg_id character varying not null,
  state_farmer_share_total_amount numeric GENERATED ALWAYS as (
    (
      COALESCE(state_share_amt, (0)::numeric) + COALESCE(farmer_share_amt, (0)::numeric)
    )
  ) STORED (15, 2) null,
  constraint beneficiary_share_pkey primary key (id, reg_id)
) TABLESPACE pg_default;

create trigger trigger_beneficiary_share_after_update
after
update on beneficiary_share for EACH row
execute FUNCTION insert_insurance_on_beneficiary_share_update ();



create table public.insurance (
  id serial not null,
  planned_10 date null,
  actual_10 date null,
  delay_10 integer null,
  scada_insurance_upload text null,
  insurance_no character varying(100) null,
  insurance_file text null,
  timestamp timestamp with time zone null default CURRENT_TIMESTAMP,
  insurance_company character varying(200) null,
  policy_type character varying(100) null,
  coverage_amount numeric(15, 2) null,
  premium_amount numeric(10, 2) null,
  policy_start_date date null,
  policy_end_date date null,
  renewal_date date null,
  insurance_status character varying(50) null default 'Pending'::character varying,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  serial_no character varying null,
  reg_id character varying not null,
  constraint insurance_pkey primary key (id, reg_id)
) TABLESPACE pg_default;




create table public.ip_payment (
  id serial not null,
  planned_11 character varying(50) null,
  actual_11 character varying(50) null,
  delay_11 character varying(50) null,
  ip_jcr_csr_payment numeric(15, 2) null,
  installation_payment_to_ip text null,
  ip_payment_per_installation numeric(15, 2) null,
  gst_18_percent numeric(15, 2) null,
  bill_send_date date null,
  timestamp timestamp with time zone null default CURRENT_TIMESTAMP,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  serial_no character varying null,
  reg_id character varying not null,
  total_amount_payment_to_ip numeric null,
  ho_csr_60_percent numeric null,
  ho_csr_75_percent numeric null,
  transport_expense numeric null,
  remarks text null,
  constraint ip_payment_pkey primary key (id, reg_id)
) TABLESPACE pg_default;



create table public.system_info (
  id serial not null,
  planned_7 date null,
  actual_7 date null,
  delay_7 integer null,
  imei_no character varying(50) null,
  motor_serial_no character varying(100) null,
  pump_serial_no character varying(100) null,
  controller_serial_no character varying(100) null,
  rid_number character varying(100) null,
  panel_no_1 character varying(100) null,
  panel_no_2 character varying(100) null,
  panel_no_3 character varying(100) null,
  panel_no_4 character varying(100) null,
  panel_no_5 character varying(100) null,
  panel_no_6 character varying(100) null,
  "Timestamp" timestamp with time zone null default CURRENT_TIMESTAMP,
  system_status character varying(50) null default 'Active'::character varying,
  commissioning_date date null,
  warranty_expiry date null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  serial_no character varying null,
  reg_id character varying not null,
  constraint system_info_pkey primary key (id, reg_id)
) TABLESPACE pg_default;

create trigger trigger_system_info_after_update
after
update on system_info for EACH row
execute FUNCTION insert_jcr_status_on_system_info_update ();



create table public.work_order (
  id serial not null,
  planned_1 character varying(50) null,
  actual_1 character varying(50) null,
  delay_1 character varying(50) null,
  work_order_date date null,
  work_order_no character varying(100) null,
  work_order_file text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  serial_no character varying null,
  reg_id character varying not null,
  constraint work_order_pkey primary key (id, reg_id)
) TABLESPACE pg_default;

create trigger trigger_work_order_after_update
after
update on work_order for EACH row
execute FUNCTION insert_into_survey_from_work_order ();


create table public.jcr_status (
  id serial not null,
  planned_8 character varying(50) null,
  actual_8 character varying(50) null,
  delay_8 character varying(50) null,
  jcr_status character varying(100) null,
  jcr_submit_date date null,
  jcr_link text null,
  timestamp timestamp with time zone null default CURRENT_TIMESTAMP,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  serial_no character varying null,
  reg_id character varying not null,
  constraint jcr_status_pkey primary key (id, reg_id)
) TABLESPACE pg_default;

create trigger trigger_jcr_status_after_update
after
update on jcr_status for EACH row
execute FUNCTION insert_beneficiary_share_on_jcr_status_update ();


create table public.master_dropdown (
  id bigserial not null,
  beneficiary_share character varying(100) null,
  installer character varying(100) null,
  constraint master_dropdown_pkey primary key (id)
) TABLESPACE pg_default;

