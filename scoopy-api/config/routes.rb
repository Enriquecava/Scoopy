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
    collection do
      post :verify
    end

    member do
      get :price_history
      get :incidents
    end
  end
  resources :providers, only: :index, defaults: { format: :json }
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  # Defines the root path route ("/")
  # root "posts#index"
end
