Rails.application.routes.draw do
  devise_for :users,
           skip: [:registrations],
           defaults: { format: :json },
           controllers: {
             sessions: "users/sessions"
           }
  resources :users, only: :create, defaults: { format: :json }
  get "screenshots/:filename", to: "products#screenshot", as: :product_screenshot

  resources :products, defaults: { format: :json } do
    resources :presentations, controller: "product_presentations", only: %i[create update destroy]
    resources :provider_listings, only: %i[create update] do
      post "legacy/:record_type/:record_id", action: :assign_legacy, on: :member
    end
    collection do
      post :verify
      get "verification_batches/:id", action: :verification_batch, as: :verification_batch
    end

    member do
      get :price_history
      get :incidents
    end
  end
  resources :providers, only: :index, defaults: { format: :json }
  %w[brands categories unit_measures].each do |catalog|
    get catalog, to: "catalogs#index", defaults: { catalog: catalog, format: :json }
    post catalog, to: "catalogs#create", defaults: { catalog: catalog, format: :json }
    patch "#{catalog}/:id", to: "catalogs#update", defaults: { catalog: catalog, format: :json }
    delete "#{catalog}/:id", to: "catalogs#destroy", defaults: { catalog: catalog, format: :json }
  end
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  # Defines the root path route ("/")
  # root "posts#index"
end
